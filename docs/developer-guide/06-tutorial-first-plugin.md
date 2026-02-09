# Tutorial: Your First Plugin

In this tutorial, we will create a simple "Hello World" plugin that adds a button to the sidebar and shows a notification when clicked.

## Step 1: Create the Plugin Directory
Create a new folder in `plugins/` called `hello-world`.

```bash
mkdir plugins/hello-world
mkdir plugins/hello-world/main
mkdir plugins/hello-world/renderer
```

## Step 2: Create the Manifest
Create `plugins/hello-world/manifest.json`:

```json
{
  "id": "com.example.hello-world",
  "version": "1.0.0",
  "name": "Hello World",
  "description": "My first plugin",
  "main": "main/index.js",
  "renderer": "renderer/index.js",
  "permissions": []
}
```

## Step 3: Create the Backend
Create `plugins/hello-world/main/index.js`:

```javascript
module.exports = {
  activate: function(context) {
    console.log('Hello World backend activated');
    
    context.ipc.on('say-hello', () => {
      console.log('Frontend said hello!');
      context.ipc.send('reply', { message: 'Hello from the Backend!' });
    });
  }
};
```

## Step 4: Create the Frontend
Create `plugins/hello-world/renderer/index.js`:

```javascript
export function activate(context) {
  const { React } = context;

  // Define our component
  const HelloButton = () => {
    const handleClick = () => {
      context.ipc.send('say-hello');
    };

    React.useEffect(() => {
      context.ipc.on('reply', (data) => {
        alert(data.message);
      });
    }, []);

    return (
      <div className="p-4 text-white hover:bg-gray-800 cursor-pointer" onClick={handleClick}>
        Click Me!
      </div>
    );
  };

  // Register it in the sidebar
  context.registerComponent('sidebar:panel', {
    id: 'hello-panel',
    component: HelloButton
  });
  
  // Add an icon to the NavRail to open the panel
  context.registerComponent('sidebar:nav-item', {
    id: 'hello-nav',
    icon: 'Star', // Assuming 'Star' is a valid icon
    label: 'Hello',
    onClick: () => context.navigate('hello-panel')
  });
}
```

## Step 5: Run It
Restart the application. You should see a new Star icon in the NavRail. Click it, then click the "Click Me!" button in the sidebar. You should see an alert!
