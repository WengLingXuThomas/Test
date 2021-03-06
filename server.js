const Koa         = require('koa');
const serve       = require('koa-static');
const websockify  = require('koa-websocket');
const cors        = require('kcors');
const { v4: uuidv4 } = require('uuid');

const WEB_PORT = process.env.WEB_PORT || 3000;

const app = websockify(new Koa());

app.use(cors({
    origin: '*'
}));

app.use(serve('./public'));

const connections = new Map();

app.ws.use(async (ctx, next) => {
    const uuid = uuidv4();
    connections.set(uuid, ctx.websocket);

    ctx.websocket.on('close', () => {
        connections.delete(uuid);
    });

    ctx.websocket.on('message', (data) => {
        const message = JSON.parse(data);
        switch(message.type){
            case 'offer':
            case 'answer':
            case 'candidate':
                connections.get(message.to) && connections.get(message.to).send(JSON.stringify(Object.assign(message, { from: uuid })));
                break;
        }
    });

    ctx.websocket.send(JSON.stringify({ type: 'welcome', uuid }));

    //tell all exsiting connections about this new connection
    for(let [id, connection] of connections){
        id !== uuid && connection.send(JSON.stringify({ type: 'join', from: uuid }));
    }
});

app.listen(WEB_PORT, () => {
    console.info(`Server listening on port ${WEB_PORT}`); 
})