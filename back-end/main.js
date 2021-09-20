import mysqlx from '@mysql/xdevapi';
import express, { json } from 'express';
import cors from 'cors';
import { execute, mapRows } from './database.js';
import busboy from 'connect-busboy'

const url = 'mysqlx://app:pass@localhost:33060/Twitter';
const port = process.env.PORT ?? 9999; 
const client = mysqlx.getClient(url);

const app = express();
app.use(cors());
app.use(json());
app.use(busboy());
app.use(express.static('.'));

app.get('/posts.get', async (req, res) => {
  try {
    const posts = await execute(client, async session => {
      const table = await session.getDefaultSchema().getTable('posts');
      const result = await table.select(['id', 'img', 'content', 'likes', 'created','removed'])
        .where('removed != true')
        .orderBy('id DESC')
        .execute();

      return mapRows(result);
    });
    res.json(posts);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.delete('/post/:id', async (req, res) => {
  try {
    const posts = await execute(client, async session => {
      const table = await session.getDefaultSchema().getTable('posts');
      const result = await table.delete()
        .where('id = :id')
        .bind('id', req.params.id)
        .execute();

      return result;
    });
    res.json(posts);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.get('/posts/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id) || !Number.isFinite(id)) {
      res.sendStatus(400);
      return;
    }

    const [post] = await execute(client, async session => {
      const table = await session.getDefaultSchema().getTable('posts');
      const result = await table.select(['id', 'content', 'likes', 'created'])
        .where('id = :id AND removed != true')
        .bind('id', id)
        .execute();

      return mapRows(result);
    });

    if (post === undefined) {
      res.sendStatus(404);
      return;   
    }

    res.json(post);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.post('/api/upload', function (req, res) {
  let fstream;
  req.pipe(req.busboy);
  req.busboy.on('file', function (filename, file) {
    console.log('Uploading: ' + filename);

    const newFilename = `${filename}_image_${Date.now()}_${parseInt(
      Math.random() * 10000000
    )}${filename.slice(filename.lastIndexOf('images'))}`;

    fstream = fs.createWriteStream(`${__dirname}/images/${newFilename}`);
    file.pipe(fstream);
    fstream.on('close', function () {
      console.log('uploaded');
      res.json({ imagePath: `${hostUrl}/images/${newFilename}` });
    });
  });
});

app.get('img/:id', async (req, res) => {
  const id = req.params.id;
  const img = await knex('img').where({id: id}).first();
  if (img) {
    req.end(img.img);
  } else {
    res.end('No img whit that Id!')
  }
});

app.post('/posts', async (req, res) => {
  try {
    const {content, img} = req.body;
    const [post] = await execute(client, async session => {
      const table = await session.getDefaultSchema().getTable('posts');
      const insert = await table.insert('content', 'img').values(content, img).execute();
      const id = insert.getAutoIncrementValue();

      const result = await table.select(['id', 'content', 'likes', 'created', 'img'])
        .where('id = :id')
        .bind('id', id)
        .execute();

      return mapRows(result);
    });

    if (post === undefined) {
      res.sendStatus(404);
      return;
    }

    res.json(post);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.listen(port);