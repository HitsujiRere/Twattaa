'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
require('dotenv').config();
const { getPostgresClient } = require('./postgres');

const PORT = process.env.PORT || 8000;

const app = express();
app.use(bodyParser.urlencoded({
    extended: true,
}));
app.use(bodyParser.json());
app.use(express.static('public'));

const getMessages = async () => {
    let messagesText;
    const db = await getPostgresClient();

    try {
        const sql = `SELECT * FROM messages ORDER BY id;`;

        await db.begin();
        const ret = await db.execute(sql);
        const retText = JSON.stringify(ret)
            .replace(/null/g, '""');
        messagesText = retText;

        await db.commit();

    } catch (e) {
        await db.rollback();
        throw e;
    } finally {
        await db.release();
    }

    console.log('messages loaded!');
    return messagesText;
};

const insertMessages = async (message) => {
    const db = await getPostgresClient();

    try {
        const sql = `INSERT INTO messages (body, talk_on) VALUES ($1, now());`;
        const params = [message];

        await db.begin();
        await db.execute(sql, params);
        await db.commit();

    } catch (e) {
        await db.rollback();
        throw e;
    } finally {
        await db.release();
    }
};

const searchMessages = async (searchText) => {
    let messagesText;
    const db = await getPostgresClient();

    try {
        const sql = `SELECT * FROM messages WHERE body LIKE $1 ORDER BY id;`;
        const params = [searchText];

        await db.begin();
        const ret = await db.execute(sql, params);
        const retText = JSON.stringify(ret)
            .replace(/null/g, '""');
        messagesText = retText;

        await db.commit();

    } catch (e) {
        await db.rollback();
        throw e;
    } finally {
        await db.release();
    }

    return messagesText;
};

const getMessageLastID = async () => {
    let messageLastID;
    const db = await getPostgresClient();

    try {
        const sql = `select last_value from messages_id_seq;`;

        await db.begin();
        const ret = await db.execute(sql);
        messageLastID = ret[0].last_value;
        // const retText = JSON.stringify(ret[0].json_agg)
        //     .replace(/null/g, '""');
        // messagesText = retText;

        await db.commit();

    } catch (e) {
        await db.rollback();
        throw e;
    } finally {
        await db.release();
    }

    return messageLastID;
};

const favMessage = async (msg_id, add, user_id) => {
    const db = await getPostgresClient();

    try {
        await db.begin();
        await db.execute(`UPDATE messages SET fav_count = fav_count + $1 WHERE id = $2;`, [add, msg_id]);
        if (add === 1) {
            await db.execute(`INSERT INTO fav_history (user_id, message_id) VALUES ($1, $2);`, [user_id, msg_id]);
        } else if (add === -1) {
            await db.execute(`DELETE FROM fav_history where user_id = $1 AND message_id = $2;`, [user_id, msg_id]);
        }
        await db.commit();

    } catch (e) {
        await db.rollback();
        throw e;
    } finally {
        await db.release();
    }
};

const getFavMessagesID = async (user_id) => {
    let messagesID = '';
    const db = await getPostgresClient();

    try {
        const sql = `SELECT * FROM fav_history WHERE user_id = $1 ORDER BY user_id;`;
        const params = [user_id];

        await db.begin();
        const ret = await db.execute(sql, params);
        const retText = JSON.stringify(ret)
            .replace(/null/g, '""');
        messagesID = retText;

        await db.commit();

    } catch (e) {
        await db.rollback();
        throw e;
    } finally {
        await db.release();
    }

    return messagesID;
};

const renderHTML = (res, path) => {
    fs.readFile(path, 'utf-8', (err, data) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(data);
        res.end();
    });
};

app.get('/', (req, res) => {
    renderHTML(res, './public/html/Home.html');
});

app.get('/explore', (req, res) => {
    renderHTML(res, './public/html/Explore.html');
});

app.get('/get_messages', async (req, res) => {
    res.write(await getMessages());
    res.end();
});

app.get('/explore_messages', async (req, res) => {
    const searchText = req.query.text;
    console.log('search', searchText);
    res.write(await searchMessages(searchText));
    res.end();
});

app.get('/get_fav_messages', async (req, res) => {
    const user_id = req.query.user_id;
    console.log('user_id', user_id);
    res.write(await getFavMessagesID(user_id));
    res.end();
});

app.get('/get_user_id', async (req, res) => {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let user_id = '';
    for (let i = 0; i < 8; i++) {
        user_id += chars[Math.floor(Math.random() * chars.length)];
    }
    console.log('get_user_id', user_id);
    res.write(user_id);
    res.end();
});

const server = app.listen(PORT, async (req, res) => {
    console.log('Server is up!');
});

const socketio = require('socket.io')(server);

socketio.on('connection', async (socket) => {
    socket.on('Twattaa_SEND', async (id, body, talk_on) => {
        id = await getMessageLastID();
        await insertMessages(body);
        talk_on = new Date();
        const message = { id: id, body: body, talk_on: talk_on };
        console.log(message);
        socketio.emit('Twattaa_SEND', id, body, talk_on);
    });

    socket.on('Twattaa_FAV', async (msg_id, add, user_id) => {
        await favMessage(msg_id, add, user_id);
        const message = { msg_id: msg_id, add: add, user_id: user_id };
        console.log(message);
        socketio.emit('Twattaa_FAV', msg_id, add);
    });
});
