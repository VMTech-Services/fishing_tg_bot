require('dotenv').config();
const { Telegraf } = require('telegraf');

const lootData = require('./loot.json');
const rarity = require('./lootQuality.json')
const texts = require('./texts.json')

const bot = new Telegraf(process.env.BOT_TOKEN);

function getRandomByRarity(table, level) {
    const lootOfLevel = lootData.filter(x => x.rarity == level)

    if (lootOfLevel.length > 0) {
        return lootOfLevel[Math.floor(Math.random() * lootOfLevel.length)]
    } else {
        return getRandomByRarity(table, level)
    }
}

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

function randFromArr(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

const usersData = {}

bot.on('inline_query', async (ctx) => {

    if (!usersData[ctx.update.inline_query.from.id]) {
        usersData[ctx.update.inline_query.from.id] = {
            requestsCount: 0
        }
    }
    usersData[ctx.update.inline_query.from.id].requestsCount += 1

    let fishingRepeats = 0

    const fishQuery = parseInt(ctx.update.inline_query.query)

    if (fishQuery) {
        fishingRepeats = fishQuery
    } else {
        fishingRepeats = 1
    }

    const stringArray = []

    let isBigRequest = false

    if (fishingRepeats > 10) {
        fishingRepeats = 10
        isBigRequest = true
    }

    if (fishingRepeats > 1) {
        const loot = [];
        for (let i = 0; i < fishingRepeats; i++) {
            loot.push(getRandomLoot());
        }

        const organizedLoot = [];
        const rarityMap = new Map();

        for (const item of loot) {
            const rarity = item.rarity;
            if (!rarityMap.has(rarity)) {
                rarityMap.set(rarity, new Map());
            }
            const itemsMap = rarityMap.get(rarity);

            if (itemsMap.has(item.name)) {
                const existing = itemsMap.get(item.name);
                itemsMap.set(item.name, { ...existing, count: existing.count + 1 });
            } else {
                itemsMap.set(item.name, {
                    count: 1,
                    description: item.description
                });
            }
        }

        const sortedRarities = [...rarityMap.keys()].sort((a, b) => a - b);

        for (const rarity of sortedRarities) {
            const itemsData = [];
            const itemsMap = rarityMap.get(rarity);

            for (const [name, data] of itemsMap) {
                itemsData.push({
                    name,
                    count: data.count,
                    description: data.description
                });
            }

            organizedLoot.push({
                rarity: rarity,
                items: itemsData
            });
        }

        stringArray.push(randFromArr(texts.mulifish.going));
        // stringArray.push("");
        stringArray.push(randFromArr(texts.mulifish.fishing));
        // stringArray.push("");
        stringArray.push(randFromArr(texts.mulifish.returning));
        stringArray.push("");
        stringArray.push("Ваш улов:");

        for (const rarityGroup of organizedLoot) {
            const rarityInfo = rarity[rarityGroup.rarity];
            stringArray.push("");
            stringArray.push(`${rarityInfo.emoji} ${rarityInfo.name} (${rarityGroup.rarity + 1}/10):`);

            for (const item of rarityGroup.items) {
                stringArray.push("");
                stringArray.push(`- ${item.name} ×${item.count}`);
                stringArray.push(`\`${item.description}\``);
            }
        }
    } else {
        const loot = getRandomLoot();

        stringArray.push(randFromArr(texts.throw))
        stringArray.push(randFromArr(texts.unwind))
        if (Math.random() * 1000 < 1) {
            stringArray.push(randFromArr(texts.fail))
        } else {
            stringArray.push(randFromArr(texts.catch))
            stringArray.push("")
            stringArray.push(`Вы поймали: ${loot.name} ${rarity[loot.rarity].emoji} ${rarity[loot.rarity].name}(${loot.rarity + 1}/10)`)
            stringArray.push(`\`${loot.description}\``)
        }
    }

    if (usersData[ctx.update.inline_query.from.id].requestsCount % 10 == 0) {
        stringArray.push("")
        stringArray.push("Помоги боту, [предложи предмет](https://forms.gle/4pG5gVsS2Uee5rYb7)!")
    }

    stringArray.push("")
    stringArray.push("`fishygame_bot-v2`")

    ctx.answerInlineQuery([{
        type: 'article',
        id: `loot_${Date.now()}`,
        title: fishingRepeats == 1 ? '🎣 Закинуть удочку' : `🎣 Пойти рыбачить (х${fishingRepeats}${isBigRequest ? 'max' : ''}) `,
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

        await ctx.reply(resultString.join('\n'));
    }
})

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));