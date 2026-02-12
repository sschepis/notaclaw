import { compileReact } from '../renderer/compiler';

describe('React Compiler', () => {
  it('compiles simple JSX', () => {
    const code = `
      import React from 'react';
      export default () => <div>Hello</div>;
    `;
    const result = compileReact(code);
    // Babel output varies, but it should contain React.createElement or similar
    // And definitely the text content
    expect(result).toContain('Hello');
    expect(result).toContain('React.createElement');
  });

  it('handles syntax errors gracefully', () => {
    const code = `
      import React from 'react';
      export default () => <div>Unclosed
    `;
    const result = compileReact(code);
    expect(result).toContain('Transpilation Error');
  });
});
