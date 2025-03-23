require('dotenv').config();
const { Telegraf } = require('telegraf');

const lootData = require('./loot.json');
const rarity = require('./lootQuality.json')
const texts = require('./texts.json')

const bot = new Telegraf(process.env.BOT_TOKEN);

const getRandomByRarity = (i, t) => (f => f.length ? f[Math.random() * f.length | 0] : t > 0 ? getRandomByRarity(i, t - 1) : null)(i.filter(x => x.rarity === t));

function getRandomLoot() {
    let level = 0
    while (level < 9) {
        const randResult = Math.random()
        if (randResult < 0.5) {
            level++
        } else {
            break
        }
    }
    return getRandomByRarity(lootData, level)
}

function escapeHTML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function randFromArr(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

const userRequestsCounter = {}

bot.on('inline_query', async (ctx) => {
    const loot = getRandomLoot();

    if (!userRequestsCounter[ctx.update.inline_query.from.id]) {
        userRequestsCounter[ctx.update.inline_query.from.id] = 1
    } else {
        userRequestsCounter[ctx.update.inline_query.from.id] += 1
    }

    const stringArray = []
    stringArray.push(randFromArr(texts.throw))
    stringArray.push("")
    stringArray.push(randFromArr(texts.unwind))
    stringArray.push("")
    if (Math.random() * 10000 < 1) {
        stringArray.push(randFromArr(texts.fail))
    } else {
        stringArray.push(randFromArr(texts.catch))
        stringArray.push("")
        stringArray.push(`Вы поймали: ${loot.name} ${rarity[loot.rarity].emoji} ${rarity[loot.rarity].name}(${loot.rarity + 1}/10)`)
        stringArray.push(`\`${loot.description}\``)
    }

    if (userRequestsCounter[ctx.update.inline_query.from.id] >= 10) {
        userRequestsCounter[ctx.update.inline_query.from.id] = 0
        stringArray.push("")
        stringArray.push("Помоги боту, [предложи предмет](https://forms.gle/4pG5gVsS2Uee5rYb7)!")
    }

    ctx.answerInlineQuery([{
        type: 'article',
        id: `loot_${Date.now()}`,
        title: '🎣 Закинуть удочку',
        input_message_content: {
            message_text: stringArray.join('\n'),
            parse_mode: 'markdown',
            disable_web_page_preview: true
        }
    }], { cache_time: 0 });
});

bot.command('lootpool', async (ctx) => {
    const lootlist = []
    for (const rar of rarity) {
        lootlist.push({
            name: rar.emoji + ' ' + rar.name,
            items: []
        })
    }

    lootData.forEach((item, id) => {
        lootlist[item.rarity].items.push({
            name: item.name,
            id
        })
    })

    for (const listID in lootlist) {
        lootlist[listID].items = lootlist[listID].items.sort((a, b) => a.id - b.id)
    }

    for (const [rar, list] of lootlist.entries()) {
        const resultString = [];
        resultString.push(`Список предметов класса ${list.name} (${rar + 1}/10)`);

        for (const item of list.items) {
            resultString.push(`${item.id}. ${item.name}`);
        }

        // Ожидаем отправки каждого сообщения
        await ctx.reply(resultString.join('\n'));
    }
})

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));