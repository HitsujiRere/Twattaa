
const socketio = io();

class Message {
    constructor(id, body, talk_on, fav_count) {
        this.id = id;
        this.body = body;
        this.talk_on = talk_on;
        this.fav_count = fav_count;
        this.is_fav = false;
    }

    static fromJson(json) {
        const ms = new Message('', '', '', 0);
        ms.id = json.id;
        ms.body = json.body;
        ms.talk_on = new Date(json.talk_on);
        ms.fav_count = json.fav_count;
        return ms;
    }
}

const timelineApp = new Vue({
    el: '#timeline',
    data: {
        xhr: new XMLHttpRequest(),
        messages: []
    },
    methods: {
        searchMessages: function(searchText) {
            this.xhr.addEventListener('load', () => {
                timelineApp.messages.splice(0);
                for (const resMessage of JSON.parse(this.xhr.responseText)) {
                    const message = Message.fromJson(resMessage);
                    timelineApp.messages.unshift(message);
                }
            });
            this.xhr.open('POST', '/explore_messages');
            this.xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            this.xhr.send(this.EncodeHTMLForm({text: searchText}));
        },
        EncodeHTMLForm: function(data) {
            const params = [];
        
            for (const name in data) {
                const value = data[name];
                const param = encodeURIComponent(name) + '=' + encodeURIComponent(value);
        
                params.push(param);
            }
        
            return params.join('&').replace(/%20/g, '+');
        },        
        fav: function(message) {
            console.log('fav', message);
            socketio.emit('Twattaa_FAV', message.id, message.is_fav ? 1 : -1);
        }
    },
});

const searchApp = new Vue({
    el: '#search',
    data: {
        searchText: '',
    },
    methods: {
        search: function() {
            timelineApp.searchMessages(this.searchText);
        }
    },
});

socketio.on('Twattaa_FAV', (id, add) => {
    timelineApp.messages.find(item => item.id == id).fav_count += add;
});
