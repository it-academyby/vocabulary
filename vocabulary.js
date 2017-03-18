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
        wordDef.definition = $("h3.definition").map((i, el) => {
          let pos = $(el).find("a").attr("title");
          let def = $(el).contents().last().text().replace(/\s+/g, " ");
          return {pos, def};
        }).get();
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


/* example */
const fs = require("fs");

let words = fs.readFileSync("./g.txt", "utf-8").split("\n");

let a = new Vocabulary();
Promise.all(words.slice(0, 1).map(w => a.fullCrawl(w))).then(wordDefs => {
  console.log(JSON.stringify(wordDefs, null, 2));
}).catch(reason => { 
  console.log(reason)
});

// a.sentence("test").then(r => console.log(r));
// a.example("people").then(r => console.log(r));
// a.grabText("scarletletter.txt").then(res => a.grab(res)).then(res => console.log(res));
// a.grab("The grass-plot before the jail, in Prison Lane, on a certain summer morning, not less than two centuries ago, was occupied by a pretty large number of the inhabitants of Boston, all with their eyes intently fastened on the iron-clamped oaken door. Amongst any other population, or at a later period in the history of New England, the grim rigidity that petrified the bearded physiognomies of these good people would have augured some awful business in hand. It could have betokened nothing short of the anticipated execution of some noted culprit, on whom the sentence of a legal tribunal had but confirmed the verdict of public sentiment. But, in that early severity of the Puritan character, an inference of this kind could not so indubitably be drawn. It might be that a sluggish bond-servant, or an undutiful child, whom his parents had given over to the civil authority, was to be corrected at the whipping-post. It might be that an Antinomian, a Quaker, or other heterodox religionist, was to be scourged out of the town, or an idle or vagrant Indian, whom the white man's firewater had made riotous about the streets, was to be driven with stripes into the shadow of the forest. It might be, too, that a witch, like old Mistress Hibbins, the bitter-tempered widow of the magistrate, was to die upon the gallows. In either case, there was very much the same solemnity of demeanour on the part of the spectators, as befitted a people among whom religion and law were almost identical, and in whose character both were so thoroughly interfused, that the mildest and severest acts of public discipline were alike made venerable and awful. Meagre, indeed, and cold, was the sympathy that a transgressor might look for, from such bystanders, at the scaffold. On the other hand, a penalty which, in our days, would infer a degree of mocking infamy and ridicule, might then be invested with almost as stern a dignity as the punishment of death itself. hello world!!! I love you xiaobai!!").then(res => console.log(res));
