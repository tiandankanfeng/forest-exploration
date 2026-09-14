# Railway 部署

本项目通过根目录 Dockerfile 部署为常驻 Node.js 服务，保留现有 Vercel 配置。
镜像包含混淆后的 index.js、index.html 和 node-pty 原生依赖；以 node 用户运行。

## 创建服务

1. 在 Railway 选择从 GitHub 仓库部署，项目根目录保持为仓库根目录。
2. Railway 自动识别 Dockerfile。启动命令留空，使用镜像的 `node index.js`。
3. 在 Networking 中生成公开域名或绑定自定义域名，目标端口使用服务的 `PORT`。
   Railway 会注入 PORT，代码已支持；本地默认值为 3000。
4. 按下表设置变量，尤其是 DOMAIN，随后重新部署。
5. 将 Healthcheck Path 设置为 `/`；这是 HTTP 就绪检查，不代表代理或哪吒已连通。
   现有首页读取失败的兜底也返回 200，验收时必须检查页面正文。
6. 使用单副本，关闭 Serverless / 自动休眠，避免哪吒常驻连接因空闲而停止。
   不要让不同部署的哪吒 Agent 共用同一 UUID。

## 环境变量

| 变量 | 设置方式 |
| --- | --- |
| `DOMAIN` | 必填为 Railway 公开域名或已绑定的自定义域名，只填主机名，不带协议、端口和路径。否则订阅仍使用代码中的 forest.komoribe.link。 |
| `UUID` | 设置此服务专用 UUID，作为现有代理凭据和哪吒身份。 |
| `PORT` | 通常使用 Railway 自动注入值。EXPOSE 3000 仅记录本地默认端口。 |
| `NAME` | 可设为 Railway，影响订阅名称。 |
| `SUB_PATH` | 可选，订阅路径，默认 vercel，不带开头斜杠。 |
| `WSPATH` | 可选，WebSocket 路径，默认 UUID 前 8 位，不带开头斜杠。 |
| `NEZHA_SERVER` | 可选，哪吒服务器 host:port；与 NEZHA_KEY 一起设置才启动 Agent。 |
| `NEZHA_KEY` | 可选，哪吒认证密钥，在 Railway Variables 中设置。 |
| `SHOW_LOG` | 排查时设为 1；关闭时删除变量。字符串 false 仍会启用日志。 |
| `AUTO_ACCESS` | 保持未设置。现有保活会向第三方登记订阅 URL，常驻部署不需要；字符串 false 也会启用。 |

若保留 Cloudflare Worker 入口，需另行将其上游改为 Railway 服务域名。
只有自定义域名的流量已经指向 Railway 时，才将该域名用于 DOMAIN。

## 本地容器验证

```sh
docker build -t forest-exploration .
docker run --rm -p 3000:3000 -e PORT=3000 -e DOMAIN=example.test forest-exploration
```

打开 http://localhost:3000，应显示完整森林首页；访问不存在的路径应返回 404。
部署后检查 `/${SUB_PATH}` 解码后的订阅域名，并用客户端实际验证 WebSocket 转发。
如启用哪吒，另行验证上线、终端和文件传输。

终端和监控面向容器环境，运行权限为 node 用户。容器可写文件不保证跨部署保留；
如需持久化上传文件，在 Railway 挂载 Volume 并确认 node 用户有权限，勿覆盖 /app。

## 平台说明

- [Dockerfile 自动识别](https://docs.railway.com/builds/dockerfiles)
- [PORT 与健康检查](https://docs.railway.com/deployments/healthchecks)
- [启动命令](https://docs.railway.com/builds/build-and-start-commands)

当前 Railway 文档已将 railway.json / railway.toml 标记为弃用，且新服务不能启用。
这里采用 Dockerfile 自动构建与服务面板设置，不新增旧式配置文件。
参见 [Config as Code](https://docs.railway.com/config-as-code)。
