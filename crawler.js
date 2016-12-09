import mongoose from 'mongoose';
import cheerio from 'cheerio';
import fetch from 'isomorphic-fetch';


let dbConfig = {
  host: "127.0.0.1",
  port: "27017",
  database: "poems-beta"
}


const poemSchema = mongoose.Schema({
  id: {type: Number, unique: true},
  title: String,
  dynasty: String,
  author: String,
  rhyme: String,
  type: String,
  content: String
});

let Poem = mongoose.model('Poem', poemSchema);

let mongodbUrl = `mongodb://${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
console.log(mongodbUrl);
mongoose.Promise = global.Promise;
mongoose.connect(mongodbUrl);

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    console.log(`fetch sucess, status code ${response.status}`);
    return response;
  } else {
    let error = new Error(response.statusText);
    console.log(`error: status code ${response.status}`)
    error.response = response;
    throw error;
  }
}

function parseHTML(html) {
  let markup = '<div>Something <b>bold</b></div>';
  let $ = cheerio.load(html);
  let title_text = $('.title').text();
  let title_dynasty_author = title_text.split(/\u3000+/);
  let title_dynasty_author_arr = title_dynasty_author[0].split(/[（·）]/);
  let content = $('.content').text().replace(/[^\u4e00-\u9fff\uff0c\u3002]+/g,"");
  let rhyme = title_text.match(/押(.*)韻/);
  let type = title_text.match(/(七言絕句|五言絕句|五言律詩|七言律詩)/);
  rhyme = (rhyme === null ? "" : rhyme[1]);
  type = (type === null ? "" : type[1]);
  let poemObj = {
    title: title_dynasty_author_arr[0],
    dynasty: title_dynasty_author_arr[1],
    author: title_dynasty_author_arr[2],
    rhyme: rhyme,
    type: type,
    content: content
  }
  return poemObj;
}



function savePoem (idx, poemData) {
  const { title, dynasty, author, rhyme, type, content } = poemData;
  console.log(idx, poemData);
  const query = {id: idx};
  const update = {
    id: idx,
    title: title,
    dynasty: dynasty,
    author: author,
    rhyme: rhyme,
    type: type,
    content: content
  };
  const options = { upsert: true, new: true };

  Poem.findOneAndUpdate(query, update, options, function(error, result) {
    
  });
}

let delayPromise = (delay) => {
  return function (data) {
    return new Promise(function(resolve, reject) {
      setTimeout(function(){
        resolve(data);
      }, delay);
    });
  };
}

let fetchPoem = (idx) => {
  let url = `http://sou-yun.com/Query.aspx?type=poem&id=${idx}&lang=t`;
  fetch(url)
    .then(checkStatus)
    .then(res => res.text())
    .then(parseHTML)
    .then(savePoem.bind(null, idx))
    .then(delayPromise(200))
    .then(() => {
      idx += 1;
      fetchPoem(idx);
    })
    .catch(err => {
      console.log(`error catched: ${err.response.status}`);
      fetchPoem(idx);
    });
}

fetchPoem(700000  );
