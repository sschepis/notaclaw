import { getQuickJS, QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';

export type SandboxType = 'iframe' | 'quickjs' | 'local';

export interface SandboxOptions {
  type: SandboxType;
  code: string;
  context: any; // The PluginContext to expose
}

export class SandboxService {
  private static instance: SandboxService;

  private constructor() {}

  static getInstance(): SandboxService {
    if (!SandboxService.instance) {
      SandboxService.instance = new SandboxService();
    }
    return SandboxService.instance;
  }

  async execute(options: SandboxOptions): Promise<any> {
    switch (options.type) {
      case 'quickjs':
        return this.executeInQuickJS(options.code, options.context);
      case 'iframe':
        return this.executeInIframe(options.code, options.context);
      case 'local':
      default:
        return this.executeLocally(options.code, options.context);
    }
  }

  /**
   * Execute code in the current context (legacy/insecure mode)
   * Uses new Function()
   */
  private executeLocally(code: string, context: any) {
    const module = { exports: {} as any };
    const wrapper = new Function('module', 'exports', 'context', 'require', code);
    wrapper(module, module.exports, context, context.require);
    
    // Wrap to ensure dispose exists
    const instance = module.exports;
    if (instance && typeof instance === 'object') {
        instance.dispose = instance.dispose || (() => {});
    }
    return instance;
  }

  /**
   * Execute code in a QuickJS WASM sandbox
   * Best for logic-only plugins that don't need DOM access
   */
  private async executeInQuickJS(code: string, context: any) {
    const QuickJS = await getQuickJS();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    try {
      // 1. Expose context to QuickJS
      const globalObj = vm.global;
      
      // Define a simple console.log
      const logHandle = vm.newFunction("log", (...args) => {
        const nativeArgs = args.map(vm.dump);
        console.log("[QuickJS]", ...nativeArgs);
      });
      vm.setProp(globalObj, "console", vm.newObject());
      const consoleHandle = vm.getProp(globalObj, "console");
      vm.setProp(consoleHandle, "log", logHandle);
      
      // Serialize context data
      const contextData = {
        id: context.id,
        manifest: context.manifest,
        // ... serializable parts
      };
      
      const contextHandle = this.marshal(vm, contextData);
      vm.setProp(globalObj, "context", contextHandle);
      
      // Create module/exports
      const moduleHandle = vm.newObject();
      const exportsHandle = vm.newObject();
      vm.setProp(moduleHandle, "exports", exportsHandle);
      vm.setProp(globalObj, "module", moduleHandle);
      vm.setProp(globalObj, "exports", exportsHandle);

      // Execute code
      const result = vm.evalCode(code);
      
      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        // Clean up on error
        moduleHandle.dispose();
        exportsHandle.dispose();
        contextHandle.dispose();
        consoleHandle.dispose();
        logHandle.dispose();
        vm.dispose();
        runtime.dispose();
        throw new Error(`QuickJS Execution Error: ${JSON.stringify(error)}`);
      }

      const exports = vm.dump(vm.getProp(moduleHandle, "exports"));
      
      // Cleanup immediate result handle, but keep VM alive
      result.value.dispose();
      
      // Define cleanup function
      const dispose = () => {
          if (moduleHandle.alive) moduleHandle.dispose();
          if (exportsHandle.alive) exportsHandle.dispose();
          if (contextHandle.alive) contextHandle.dispose();
          if (consoleHandle.alive) consoleHandle.dispose();
          if (logHandle.alive) logHandle.dispose();
          if (vm.alive) vm.dispose();
          if (runtime.alive) runtime.dispose();
      };

      return {
          activate: async (ctx: any) => {
              // Call the activate function inside the VM
              if (!vm.alive) {
                  console.warn("QuickJS VM is disposed, cannot activate");
                  return;
              }
              
              // Get the latest exports
              // We need to get module.exports again because the script might have assigned to it
              const currentModule = vm.getProp(globalObj, "module");
              const currentExports = vm.getProp(currentModule, "exports");
              const activateFunc = vm.getProp(currentExports, "activate");
              
              if (vm.typeof(activateFunc) === 'function') {
                  // Marshal context (if different from initial, or just pass initial for now)
                  // For full functionality, we should marshal the passed ctx
                  const ctxHandle = this.marshal(vm, {
                      id: ctx.id,
                      manifest: ctx.manifest
                  });
                  
                  const res = vm.callFunction(activateFunc, vm.undefined, ctxHandle);
                  ctxHandle.dispose();
                  
                  if (res.error) {
                      const err = vm.dump(res.error);
                      res.error.dispose();
                      throw new Error(`QuickJS Activate Error: ${JSON.stringify(err)}`);
                  }
                  res.value.dispose();
              }
              
              activateFunc.dispose();
              currentExports.dispose();
              currentModule.dispose();
          },
          dispose,
          ...exports
      };

    } catch (err) {
      // Ensure cleanup on error
      vm.dispose();
      runtime.dispose();
      throw err;
    }
  }

  private marshal(vm: QuickJSContext, value: any): QuickJSHandle {
      if (value === null || value === undefined) return vm.null;
      if (typeof value === 'number') return vm.newNumber(value);
      if (typeof value === 'string') return vm.newString(value);
      if (typeof value === 'boolean') return value ? vm.true : vm.false;
      if (Array.isArray(value)) {
          const array = vm.newArray();
          value.forEach((item, index) => {
              const handle = this.marshal(vm, item);
              vm.setProp(array, index, handle);
              handle.dispose();
          });
          return array;
      }
      if (typeof value === 'object') {
          const obj = vm.newObject();
          Object.keys(value).forEach(key => {
              const handle = this.marshal(vm, value[key]);
              vm.setProp(obj, key, handle);
              handle.dispose();
          });
          return obj;
      }
      return vm.undefined;
  }

  /**
   * Execute code in a sandboxed iframe
   * Provides DOM isolation but allows some browser APIs
   */
  private async executeInIframe(code: string, context: any) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      // sandbox attribute: allow-scripts is needed to run code.
      // allow-same-origin is included so plugins can access parent APIs when trusted.
      iframe.sandbox.add('allow-scripts');
      iframe.sandbox.add('allow-same-origin');
      
      document.body.appendChild(iframe);

      const win = iframe.contentWindow;
      if (!win) {
        document.body.removeChild(iframe);
        return reject(new Error("Failed to create iframe window"));
      }

      // Communication channel
      // const channel = new MessageChannel();
      // const port1 = channel.port1; // Our end
      
      // Listen for ready or result
      const messageHandler = (e: MessageEvent) => {
        // We accept messages from the iframe's contentWindow
        if (e.source !== iframe.contentWindow) return;

        if (e.data.type === 'ready') {
           // Send code and context
           const contextData = {
               id: context.id,
               manifest: context.manifest
           };
           
           iframe.contentWindow?.postMessage({
               type: 'execute',
               code,
               context: contextData
           }, '*');
        } else if (e.data.type === 'success') {
            // Plugin loaded in iframe
            resolve({
                activate: async (ctx: any) => {
                    // Send activate with context
                    const contextData = {
                        id: ctx.id,
                        manifest: ctx.manifest
                    };
                    iframe.contentWindow?.postMessage({ 
                        type: 'activate',
                        context: contextData
                    }, '*');
                },
                dispose: () => {
                    window.removeEventListener('message', messageHandler);
                    if (iframe.parentNode) {
                        iframe.parentNode.removeChild(iframe);
                    }
                },
                iframe // Keep ref if needed
            });
        } else if (e.data.type === 'error') {
            reject(new Error(e.data.error));
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
            window.removeEventListener('message', messageHandler);
        }
      };

      window.addEventListener('message', messageHandler);

      // Inject the loader script
      const script = `
        window.onmessage = (e) => {
            if (e.data.type === 'execute') {
                const { code, context } = e.data;
                const module = { exports: {} };
                const exports = module.exports;
                
                try {
                    // Create a limited require
                    const require = () => { throw new Error("require not supported in iframe sandbox"); };
                    
                    const wrapper = new Function('module', 'exports', 'context', 'require', code);
                    wrapper(module, exports, context, require);
                    
                    window.pluginModule = module.exports;
                    e.source.postMessage({ type: 'success' }, '*');
                } catch (err) {
                    e.source.postMessage({ type: 'error', error: err.message }, '*');
                }
            } else if (e.data.type === 'activate') {
                if (window.pluginModule && window.pluginModule.activate) {
                    try {
                        const context = e.data.context || {};
                        window.pluginModule.activate(context); 
                    } catch (err) {
                        console.error(err);
                    }
                }
            }
        };
        // Notify parent we are ready
        // Use setTimeout to ensure the listener is attached in parent
        setTimeout(() => {
            window.parent.postMessage({ type: 'ready' }, '*'); 
        }, 0);
      `;
      
      // Use srcdoc to inject script
      iframe.srcdoc = `
        <!DOCTYPE html>
        <html>
        <body>
        <script>
          ${script}
        </script>
        </body>
        </html>
      `;
    });
  }
}
