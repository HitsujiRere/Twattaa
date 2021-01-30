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

const loadMessages = async () => {
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

const favMessage = async (id, add) => {
    const db = await getPostgresClient();

    try {
        const sql = `UPDATE messages SET fav_count = fav_count + $1 WHERE id = $2;`;
        const params = [add, id];

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
    res.write(await loadMessages());
    res.end();
});

app.post('/explore_messages', async (req, res) => {
    const searchText = req.body.text;
    console.log('search', searchText);
    res.write(await searchMessages(searchText));
    res.end();
});

const server = app.listen(PORT, async (req, res) => {
    console.log('Server is up!');
});

const socketio = require('socket.io')(server);

socketio.on('connection', async (socket) => {
    socket.on('Twattaa_SEND', async (id, body, talk_on) => {
        await insertMessages(body);
        id = await getMessageLastID();
        talk_on = new Date();
        const message = { id: id, body: body, talk_on: talk_on };
        console.log(message);
        socketio.emit('Twattaa_SEND', id, body, talk_on);
    });

    socket.on('Twattaa_FAV', async (id, add) => {
        await favMessage(id, add);
        const message = { id: id, add: add };
        console.log(message);
        socketio.emit('Twattaa_FAV', id, add);
    });
});
