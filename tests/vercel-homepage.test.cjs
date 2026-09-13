const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

test('Vercel bundle supplies the homepage to the obfuscated HTTP handler', async () => {
    const root = path.resolve(__dirname, '..');
    const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
    const build = config.builds.find(entry => entry.src === 'index.js');
    const includes = [].concat(build.config.includeFiles || []);
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    let handler;
    const modules = {
        http: { createServer(callback) { handler = callback; return { listen() {} }; } },
        fs: {
            readFile(file, encoding, callback) {
                if (file === path.join(root, 'index.html') && includes.includes('index.html')) {
                    callback(null, html);
                } else {
                    callback(Object.assign(new Error('Not included in function bundle'), { code: 'ENOENT' }));
                }
            }
        },
        ws: { WebSocket: { Server: class { on() {} } } },
        axios: {}, systeminformation: {}, '@grpc/grpc-js': {}, '@grpc/proto-loader': {},
        child_process: {}
    };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'index.js'), 'utf8'), {
        require(name) {
            if (Object.hasOwn(modules, name)) return modules[name];
            if (['os', 'net', 'dns', 'path', 'https', 'crypto', 'buffer'].includes(name)) return require(name);
            throw new Error('Unexpected module: ' + name);
        },
        process: { env: {} }, __dirname: root, Buffer, TextDecoder
    }, { timeout: 5000 });
    let status, body;
    await handler({ url: '/' }, {
        writeHead(value) { status = value; },
        end(value) { body = value; }
    });
    assert.equal(status, 200);
    assert.equal(body, html, 'The deployed homepage must not fall back to Hello world!');
});
