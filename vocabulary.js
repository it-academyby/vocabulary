"use strict";

/**
 * API wrapper for vocabulary.com
 *
 * Methods provided:
 *
 *   1. query(word) : query to get definition of one word
 *   2. example(word, conf) : query to get example sentences of one word
 *   3. fullQuery(word, conf) : query to get full definition of one word (with examples)
 *   4. grabText(textName) : get text of a file
 *   5. grab(text) : get a list of words from a piece of text
 *
 *
 *  conf: domain=F for fiction results, M for Science/Med, T for Technology, A for Arts/Culture, B for Business, send no paramters to get a mix of all
 *
 */

const rp = require('request-promise'),
      cheerio = require('cheerio');
 
class Vocabulary {
  constructor(options) {
    Object.assign(this, {
      definitionAPI: "https://www.vocabulary.com/dictionary/definition.ajax",  // get - html
      challengeAPI: "https://www.vocabulary.com/challenge/blurb/",  // get - html
      previewAPI: "https://www.vocabulary.com/challenge/preview.json",  // post <word> - json - notuseful
      grabAPI: "https://www.vocabulary.com/lists/vocabgrabber/grab.json",  // post - json
      sampleAPI: "https://www.vocabulary.com/textsamples/",  // get - text
      sentenceAPI: "https://corpus.vocabulary.com/api/1.0/examples.json", // get - json
      audioAPI: "https://audio.vocab.com/1.0/us/",  // get <id>
      sleep: 100,  // ms
      love: 300 // love tip every 300 words
    }, options);
  }

  query(word) {
    const options = {
      uri: this.definitionAPI,
      qs: {
        search: word,
        lang: "en"
      },
      transform: function (body) {
        return cheerio.load(body);
      }
    };

    return rp(options)
      .then(function ($) {
        const wordDef = {word};
        wordDef.audio = $(".audio").attr("data-audio");
        wordDef.primary = [];
        $(".definitionNavigator tr").each((i, el) => {
          let posList = $(el).find(".posList a").map((i, el) => $(el).attr("title").split(" ")[0]).get();
          let def = $(el).find(".def").map((i, el) => $(el).text()).get();
          
          // matching it to array of {pos, def}
          posList.forEach((pos, i) => {
            wordDef.primary.push({pos, def: def[i]});
          });
        });

        wordDef.definition = {};
        $("h3.definition").each((i, el) => {
          let pos = $(el).find("a").attr("title");
          let def = $(el).contents().last().text().replace(/\s+/g, " ");
          wordDef.definition[pos] = wordDef.definition[pos] || [];
          wordDef.definition[pos].push(def.trim());
        });
        return wordDef;
      });
  }

  example(word, conf) {
    const options = {
      uri: this.sentenceAPI,
      qs: Object.assign({
          query: word,
          maxResult: 10
        }, conf),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36",
      },
      json: true
    };

    return rp(options).then(res => res.result);
  }

  sentence(word) {
    const options = {
      uri: this.challengeAPI + word,
      transform: function (body) {
        return cheerio.load(body);
      }
    };

    return rp(options)
      .then(function ($) {
        return {sentence: $(".blurb").html()};
      });
  }

  fullQuery(word, conf) {
    // combine word and examples
    return this.query(word).then(wordDef => this.example(wordDef.word, conf).then(examples => Object.assign(wordDef, examples)));
  }

  fullCrawl(word, conf) {
    return this.fullQuery(word, conf).then(wordDef => this.sentence(wordDef.word).then(sentence => Object.assign(wordDef, sentence)));
  }

  grabText(textName) {
    const options = {
      uri: this.sampleAPI + textName
    };

    return rp(options);
  }

  grab(text) {
    const options = {
      method: 'POST',
      uri: this.grabAPI,
      form: {
        text: text
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36",
      },
      json: true
    };

    return rp(options);
  }
}

module.exports = Vocabulary
