
# Twattaa

## Database

### fav_history

```
twattaa=# \d fav_history
                                  テーブル"public.fav_history"
     列     |      型      | 照合順序 | Null 値を許容 |               デフォルト
------------+--------------+----------+---------------+-----------------------------------------
 id         | integer      |          | not null      | nextval('fav_history_id_seq'::regclass)
 user_id    | character(8) |          | not null      |
 message_id | integer      |          | not null      |
```

### messages

```
twattaa=# \d messages
                                         テーブル"public.messages"
    列     |             型              | 照合順序 | Null 値を許容 |              デフォルト
-----------+-----------------------------+----------+---------------+--------------------------------------
 id        | integer                     |          | not null      | nextval('messages_id_seq'::regclass)
 body      | text                        |          | not null      |
 talk_on   | timestamp without time zone |          | not null      |
 fav_count | integer                     |          |               | 0
インデックス:
    "messages_pkey" PRIMARY KEY, btree (id)
```

## .env

DATABASE_URL : database url
