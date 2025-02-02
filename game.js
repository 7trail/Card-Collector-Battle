const sleep = ms => new Promise(r => setTimeout(r, ms));

function shuffleArray(array) {
  for (let i = array.length-1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array;
}

function getOptionFromWeightedArray(arr) {
  let sum = 0;
  for (let val of arr) {
    sum += val.weight;
  }
  let randomValue = Math.random() * sum;
  let cumulativeProbability = 0;
  for (const val of arr) {
    cumulativeProbability += val.weight;
    if (randomValue <= cumulativeProbability) {
      return val;
    }
  }
  return arr[0];
}

class Card {
  constructor(type = null, power = null, defense = null, rarity = null, effect = null) {
    this.type = type;
    this.power = power;
    this.defense = defense;
    this.startDefense = defense;
    this.startPower = power;
    this.rarity = rarity;
    this.effect = effect;
    this.hasAttacked = false;
    this.toDiscard = false;
    this.isDead = false;
    this.isSpell = false;
    this.isTarget = false;
    this.onPlayEffect = null;
    this.endOfTurnEffect = null;
    this.onDeathEffect = null;
    this.combatDamageEffects = null;
    this.game = null;
    this.continuousEffect = null;
    this.goAgain = false;
    this.keywords = [];
    this.renderElement = null;
    this.activeEffect = false;
    this.hooks = []
    this.activatedAbility = null;
    this.abilityIsActive= false;
    this.abilityUsedThisTurn = false;
    this.shielded = false; 
    this.isTribute = false; 
    this.statusEffects = []; 
  }

  resetCard() {
    this.defense = this.startDefense;
    this.power = this.startPower;
    this.hasAttacked = false;
    this.toDiscard = false;
    this.abilityUsedThisTurn = false;
    this.shielded = false; 
    this.discardPromise = null;
    this.statusEffects = []; 
    if (this.cardElement) {
      this.cardElement.classList.remove("draggable-card")
    }
    this.abilityIsActive = false;
    this.activeEffect = false;

  }

  addKeyword(kw) {
    if (!this.keywords.includes(kw)) {
      this.keywords.push(kw);
    }
  }

  generateRandomCard(deckType = 'default') {
    let typeData = [
      {types: ['Warrior', 'Champion', 'Hero', 'Mage', 'Archer', 'Wizard', 'Monster','Knight', 'Paladin', 'Assassin', 'Necromancer', 'Druid', 'Berserker'], weight: 3},
      {types: ["Spell"], weight: 0.5},
      {types: ["Titan", "Elder God", "Demon Lord", "Archangel", "Cosmic Horror"], weight: 0.1, cardType: "Tribute"} 
    ];

    let selectedTypeData = getOptionFromWeightedArray(typeData);
    this.type = selectedTypeData.types[Math.floor(Math.random() * selectedTypeData.types.length)];
    if (selectedTypeData.cardType === "Tribute") {
      this.isTribute = true;
    }

    let rarities = ['Common', 'Rare', 'Epic', 'Legendary', "Holy"];
    if (deckType === 'initial') {
      rarities = ['Common', 'Rare']; 
    }
    if (deckType === 'upgrade') {
      rarities = ['Common', 'Rare', 'Epic', 'Legendary', 'Holy'];
    }
    const keywords = ['evasive', 'trample', 'leeching']; 

    let rarityProbabilities = {
      'Common': 0.24,
      'Rare': 0.35,
      'Epic': 0.25,
      'Legendary': 0.13,
      'Holy': 0.03
    };
    if (deckType === 'initial') {
      rarityProbabilities = {
        'Common': 0.7,
        'Rare': 0.3
      };
    }
    if (deckType === 'upgrade') {
      rarityProbabilities = {
        'Common': 0.3,
        'Rare': 0.3,
        'Epic': 0.2,
        'Legendary': 0.1,
        'Holy': 0.1
      };
    }

    let randomValue = Math.random();
    let cumulativeProbability = 0;
    for (const rarity of rarities) {
      cumulativeProbability += rarityProbabilities[rarity];
      if (randomValue <= cumulativeProbability) {
        this.rarity = rarity;
        break;
      }
    }

    const rarityMultipliers = {
      'Common': { maxPower: 5, maxDefense: 5, effectCount: 1, effectPower: 1, goAgainChanceSpell : 0.75, activatedAbilityChance: 0.2, keywordChance: 0.1 },
      'Rare': { maxPower: 8, maxDefense: 8, effectCount: 1, effectPower: 2, goAgainChanceSpell : 0.5, activatedAbilityChance: 0.4, keywordChance: 0.2 },
      'Epic': { maxPower: 12, maxDefense: 12, effectCount: 2, effectPower: 3, goAgainChanceSpell : 0.2, activatedAbilityChance: 0.6, keywordChance: 0.3 },
      'Legendary': { maxPower: 15, maxDefense: 15, effectCount: 2, effectPower: 4, goAgainChanceSpell : 0.1, activatedAbilityChance: 0.6, keywordChance: 0.4 },
      'Holy': { maxPower: 18, maxDefense: 18, effectCount: 3, effectPower: 3, goAgainChanceSpell : 0.3, activatedAbilityChance: 0.6, keywordChance: 0.6 }
    };
    const initialRarityMultipliers = {
      'Common': { maxPower: 5, maxDefense: 5, effectCount: 1, effectPower: 1, goAgainChanceSpell : 0.75, activatedAbilityChance: 0.2, keywordChance: 0.1 },
      'Rare': { maxPower: 8, maxDefense: 8, effectCount: 1, effectPower: 2, goAgainChanceSpell : 0.5, activatedAbilityChance: 0.4, keywordChance: 0.2 },
    };

    let multipliers = rarityMultipliers[this.rarity];
    if (deckType === 'initial') {
      multipliers = initialRarityMultipliers[this.rarity];
    }

    if (this.isTribute) {
      multipliers.effectPower++;
    }


    if (this.type === 'Spell') {
      this.isSpell = true;
      this.power = null;
      this.defense = null;
      this.effect = this.generateRandomSpellEffects(multipliers.effectCount, multipliers.effectPower);
      this.goAgain = Math.random() < multipliers.goAgainChanceSpell;
    } else {
      this.power = Math.floor(Math.random() * multipliers.maxPower) + 1;
      this.defense = Math.floor(Math.random() * multipliers.maxDefense) + 1;
      this.effect = null;
      this.generateRandomAbilities(multipliers.effectCount, Math.ceil(0.5 + Math.random() * multipliers.effectPower*0.5));
      this.goAgain = Math.random() < 0.2;
        this.power = Math.ceil(this.power / 2);
      this.defense = Math.ceil(this.defense/1.5);
      
      if (Math.random() < multipliers.keywordChance * (this.isTribute?3:1)) {
        for (let i = 0; i < (this.isTribute?2:1); i++) {
          let kw = keywords[Math.floor(Math.random() * keywords.length)];
          if (!this.keywords.includes(kw)) {
            this.addKeyword(kw);
            if (kw == "trample") {
              this.power = Math.ceil(this.power * 1.5);
            }
          }
        }
      }

      if (this.isTribute) {
        this.power = Math.ceil(this.power * 1.5) + 3;
        this.defense = Math.ceil(this.defense * 1.5) + 6;
      }
      this.startDefense = this.defense;
      this.startPower = this.power;

    }

    if (this.rarity == "Holy") {
      if (Math.random() < 0.75) {
        let kw = keywords[Math.floor(Math.random() * keywords.length)];
        this.addKeyword(kw);
      }
    }

    if (Math.random() < multipliers.activatedAbilityChance) {
      this.generateActivatedAbility(multipliers.effectPower);
    }

    this.hasAttacked = false;
    return this;
  }

  async takeDamage(amount) {
    let actualDamage = amount;
    if (this.shielded) { 
      this.shielded = false; 
      actualDamage = 0; 
      this.game.updateBattleLog(`${this.type} blocked damage with Shield!`);
    }
    let canTrigger = this.defense> 0
    this.defense -= actualDamage;
    this.renderDamageNumber(actualDamage);
    if (this.defense <= 0 && canTrigger) {
      await this.manageDeathEffects();
      this.isDead = true;
      this.kill();
      this.game.renderHands();
      return true;
    }
    return false;
  }


  renderDamageNumber(amount) {
    const gameContainer = document.getElementById('game-container');
    const damageNumber = document.createElement('div');
    let bbox2 = gameContainer.getBoundingClientRect();
    let f = bbox2.top < 0 ? bbox2.top : 0;
    damageNumber.classList.add('damage-number');
    damageNumber.textContent = `-${amount}`;
    if (amount < 0) {
      damageNumber.classList.add('heal');
      damageNumber.textContent = `+${-amount}`;
    }
    let bbox = this.render().getBoundingClientRect();
    damageNumber.style.left = (bbox.left +  bbox.width*(0.5+(Math.random()*0.2-0.1))) + "px"
    damageNumber.style.top = (bbox.top + bbox.height*(0.5+(Math.random()*0.2-0.1)) - f) + "px"
    setTimeout(() => {
        damageNumber.remove();
    }, 900);
    gameContainer.appendChild(damageNumber);
  }

  generateEffects(effectPower) {
    let tokenSize = 2+effectPower;
    let pluralToken = effectPower > 1 ? "s" : "";
     return [
        { text: `Draw ${1 + effectPower} cards`, action: async (game, isOpponent, target) => game.drawCard(1 + effectPower, isOpponent), requiresTarget: false, positiveEffect: true, weight: 4 },
        { text: `Draw ${2 * effectPower}, then discard a card`, action: async (game, isOpponent, target) => await game.drawThenDiscard(2 * effectPower, isOpponent), requiresTarget: false, positiveEffect: true, weight: 1.2 },
        { text: `Gain ${5 * effectPower} life`, action: async (game, isOpponent, target) => game.gainLife(5 * effectPower, isOpponent), requiresTarget: false, positiveEffect: true, weight: 1  },
        { text: `Deal ${2 * effectPower} damage to opponent`, action: async(game, isOpponent, target) => game.dealDamage(2 * effectPower, isOpponent), requiresTarget: false, positiveEffect: false, weight: 1  },
        { text: `Create a 3/3 token`, action: async(game, isOpponent, target) => await game.createToken(effectPower, isOpponent), requiresTarget: false, positiveEffect: true, weight: 1  },
        { text: `Opponent loses ${3 * effectPower} life`, action: (game, isOpponent, target) => game.opponentLoseLife(3 * effectPower, isOpponent), requiresTarget: false, positiveEffect: false, weight: 1  },
        { text: `Deal ${4 * effectPower} damage to a card`, action: (game, isOpponent, target) => game.dealDamageToCard(4 * effectPower, target), requiresTarget: true, positiveEffect: false, weight: 1 },
        { text: `Destroy a random enemy card`, action: (game, isOpponent, target) => game.destroyRandomCard(isOpponent), requiresTarget: false, positiveEffect: false, weight: 1 },
        { text: `Increase a card's attack by ${3* effectPower}`, action: (game, isOpponent, target) => game.buffCardAttack(3 * effectPower, target), requiresTarget: true, positiveEffect: true, weight: 1.5  },
        { text: `Increase a card's defense by ${3* effectPower}`, action: (game, isOpponent, target) => game.buffCardDefense(3 * effectPower, target), requiresTarget: true, positiveEffect: true, weight: 1.5  },
        { text: `Increase all friendly card's attack by ${2*effectPower}`, action: (game, isOpponent, target) => game.continuousBuffAllAttack(2*effectPower, isOpponent), requiresTarget: false, positiveEffect: true, weight: 0.5 },
        { text: `Increase all friendly card's defense by ${1*effectPower}`, action: (game, isOpponent, target) => game.continuousBuffAllDefense(1*effectPower, isOpponent), requiresTarget: false, positiveEffect: true, weight: 0.5 },
        { text: `Decrease all enemy card's attack by ${2*effectPower}`, action: (game, isOpponent, target) => game.continuousDebuffAllAttack(2*effectPower, isOpponent), requiresTarget: false, positiveEffect: false, weight: 0.3 },
        { text: `Decrease all enemy card's defense by ${2*effectPower}`, action: (game, isOpponent, target) => game.continuousDebuffAllDefense(2*effectPower, isOpponent), requiresTarget: false, positiveEffect: false, weight: 0.3 },
       { text: `Deal ${4 * effectPower} damage to all cards`, action: (game, isOpponent, target) => game.dealDamageToAllCards(4 * effectPower, isOpponent), requiresTarget: false, positiveEffect: false, weight: 0.5 },
       { text: `Return a card from your discard pile to your hand`, action: async (game, isOpponent, target) => await game.returnCardFromDiscardPileToHand(isOpponent), requiresTarget: false, positiveEffect: true, weight: 1 },
       { text: `Steal ${2 * effectPower} life from opponent`, action: (game, isOpponent, target) => game.stealLife(2 * effectPower, isOpponent), requiresTarget: false, positiveEffect: true, weight: 0.8 }, 
       { text: `Exile a random card from opponent's discard pile`, action: (game, isOpponent, target) => game.exileRandomDiscard(isOpponent), requiresTarget: false, positiveEffect: false, weight: 0.4 }, 
       { text: `Rearrange the top ${4 * effectPower} cards of your deck.`, action: async (game, isOpponent, target) => await game.lookAtDeck(4 * effectPower, isOpponent), requiresTarget: false, positiveEffect: true, weight: 0.75 }, 
      { text: `Give a card you control a shield`, action: (game, isOpponent, target) => { if (target) { target.shielded = true; game.updateBattleLog(`${target.type} gains a shield!`); } }, requiresTarget: true, positiveEffect: true, weight: 1},
      { text: `Look at your opponent's hand and discard a card`, action: async (game, isOpponent, target) => await game.lookAtOpponentHandAndDiscard(isOpponent), requiresTarget: false, positiveEffect: true, weight: 1 }, 
      { text: `Stun a card for ${effectPower*2} turns`, action: (game, isOpponent, target) => { if (target) { target.addStatusEffect({type: 'stun', duration: effectPower*2}); game.updateBattleLog(`${target.type} is stunned!`); } }, requiresTarget: true, positiveEffect: false, weight: 1 }, 
      { text: `Give regeneration to a card for ${effectPower+1} turns`, action: (game, isOpponent, target) => { if (target) { target.addStatusEffect({type: 'regeneration', duration: effectPower+1, amount: 2}); game.updateBattleLog(`${target.type} gains regeneration!`); } }, requiresTarget: true, positiveEffect: true, weight: 0.7 }, 
      { text: `Poison a card for ${effectPower+1} turns`, action: (game, isOpponent, target) => { if (target) { target.addStatusEffect({type: 'poison', duration: effectPower+1, amount: 3}); game.updateBattleLog(`${target.type} is poisoned!`); } }, requiresTarget: true, positiveEffect: false, weight: 0.7 }, 
      { text: `Clear all status effects from a card`, action: (game, isOpponent, target) => { if (target) { target.clearStatusEffects(); game.updateBattleLog(`Cleared status effects from ${target.type}!`); } }, requiresTarget: true, positiveEffect: true, weight: 0.5 }, 
      { text: `Create two 2/2 tokens`, action: async (game, isOpponent, target) => {for (let i = 0; i < 2; i++) {await game.createToken(effectPower, isOpponent,2)}}, requiresTarget: false, positiveEffect: true, weight: 0.2  },
      { text: `Conjure a card from ${2 + effectPower} options`, action: async (game, isOpponent, target) => { await game.conjureCard(2 + effectPower, isOpponent)}, requiresTarget: false, positiveEffect: true, weight: 0.5  },
      ];
  }

  addStatusEffect(effect) {
    this.statusEffects.push(effect);
    this.render(); 
    this.game.renderHands();
  }

  clearStatusEffects() {
    this.statusEffects = [];
    this.render(); 
    this.game.renderHands();
  }

  hasStatusEffect(effectType) {
    return this.statusEffects.some(effect => effect.type === effectType);
  }

  generateActivatedAbility(effectPower) {
    const allEffects = this.generateEffects(effectPower);
    const abilityEffect = getOptionFromWeightedArray(allEffects);
    let costOptions = [
      { cost: "discard", value:1, text: "Discard 1 card", weight: 1 },
      { cost: "life", value:2*effectPower, text: `Pay ${2*effectPower} life`, weight: 1 },
      { cost: "sacrifice", value:1, text: "Sacrifice this card", weight: 0.5 },
      { cost: null, text: null, weight: 0.25}
    ];
    let selectedCostOption = getOptionFromWeightedArray(costOptions);
    if (this.rarity === 'Holy' || this.isTribute) {
      selectedCostOption = {cost: null, text: null, weight: 2};
    } else if (this.rarity === 'Common') {
      selectedCostOption = getOptionFromWeightedArray([costOptions[0], costOptions[1], costOptions[2]]);
    }

    let abilityText = `<b>Activated Ability:</b> `;
    if (selectedCostOption.text) {
      abilityText += `(${selectedCostOption.text}) `;
    }
    abilityText += `${abilityEffect.text}`;

    if (selectedCostOption.text) {
      this.activatedAbility = {
        cost: selectedCostOption.cost,
        text: abilityText,
        action: abilityEffect.action,
        requiresTarget: abilityEffect.requiresTarget,
        positiveEffect: abilityEffect.positiveEffect,
        value: selectedCostOption.value
      };
    } else {
      abilityText = `<b>Activated Ability:</b> ${abilityEffect.text} (No Cost)`;
      this.activatedAbility = {
        cost: null,
        text: abilityText,
        action: abilityEffect.action,
        requiresTarget: abilityEffect.requiresTarget,
        positiveEffect: abilityEffect.positiveEffect,
        value: 1
      };
    }
  }

  async activateAbility() {
    if (!this.game.canPlayCard) {
      return;
    }
    if (this.hasStatusEffect('stun')) { 
      this.game.updateBattleLog(`${this.type} is stunned and cannot activate abilities.`);
      return false;
    }
    this.canPlayCard = false;
    if (this.activatedAbility && !this.abilityUsedThisTurn) {
      this.abilityIsActive = true;
      this.game.renderHands();
      if (this.activatedAbility.cost === 'discard') {
        if (this.game.playerHand.length > 0) {
          this.game.targetSelectionPopup.textContent = "Discard a card to activate ability";
          this.game.targetSelectionPopup.classList.add('show');
          const discarded = await this.game.playerDiscardCard(); 
          if (discarded) {
            this.game.updateBattleLog(`${this.type} activated ability: ${this.activatedAbility.text}`);
            await this.activatedAbility.action(this.game, false, await this.game.selectTargetForAbility(false, this.activatedAbility));
            await sleep(500);
            this.abilityIsActive = false;
            this.abilityUsedThisTurn = true;
            this.game.renderHands();
            this.game.updateNextPhaseButton();
            this.game.targetSelectionPopup.classList.remove('show');
            return true;
          } else {
            this.game.updateBattleLog(`Discard cancelled or failed.`);
            this.game.targetSelectionPopup.classList.remove('show');
            return false;
          }
        } else {
          this.game.updateBattleLog(`Cannot activate ${this.type}'s ability: No cards to discard.`);
          return false;
        }
      } else if (this.activatedAbility.cost === 'life') {
        if (this.game.playerLife > this.activatedAbility.value) {
          this.game.playerLife -= this.activatedAbility.value;
          this.game.updateLifeDisplay();
          this.game.renderHands();
          await this.activatedAbility.action(this.game, false, await this.game.selectTargetForAbility(false, this.activatedAbility));
          await sleep(500);
          this.abilityIsActive = false;
          this.abilityUsedThisTurn = true;
          this.game.updateBattleLog(`${this.type} activated ability: ${this.activatedAbility.text}`);
          this.game.renderHands();
          this.game.updateNextPhaseButton();
          return true;
        } else {
          this.game.updateBattleLog(`Cannot activate ${this.type}'s ability: Not enough life.`);
          return false;
        }
      } else if (this.activatedAbility.cost === 'sacrifice') {
        this.game.renderHands();
        await this.activatedAbility.action(this.game, false, await this.game.selectTargetForAbility(false, this.activatedAbility));
        this.game.updateBattleLog(`${this.type} activated ability: ${this.activatedAbility.text}`);
        await sleep(500);
        this.abilityIsActive = false;
        this.isDead = true;
        this.kill();
        await this.manageDeathEffects();
        this.abilityUsedThisTurn = true;
        this.game.renderHands();
        this.game.updateNextPhaseButton();
        return true;
      } else {
        this.game.renderHands();
        await this.activatedAbility.action(this.game, false, await  this.game.selectTargetForAbility(false, this.activatedAbility));
        this.abilityUsedThisTurn = true;
        this.game.updateBattleLog(`${this.type} activated ability: ${this.activatedAbility.text} (No Cost)`);
        await sleep(500);
        this.abilityIsActive = false;
        this.game.renderHands();
        this.game.updateNextPhaseButton();
        return true;
      }
    } else if (this.abilityUsedThisTurn) {
      this.game.updateBattleLog(`${this.type}'s ability has already been used this turn.`);
      return false;
    } else {
      this.game.updateBattleLog(`${this.type} has no activated ability.`);
      return false;
    }
  }

  async manageStatusEffects() {
    for (let i = this.statusEffects.length - 1; i >= 0; i--) {
      const effect =  this.statusEffects[i];
      effect.duration--;
      if (effect.type === 'regeneration') {
        await this.game.healCard(effect.amount, this);
        this.game.updateBattleLog(`${this.type} regeneration heals for ${effect.amount}!`);
      } else if (effect.type === 'poison') {
        await this.game.dealDamageToCard(effect.amount, this);
        this.power -= 2;
        if (this.power < 0) {
          this.power = 0;
        }
        this.render();
        this.game.updateBattleLog(`${this.type} poison deals ${effect.amount} damage!`);
      }
      if (effect.duration <= 0) {
        this.statusEffects.splice(i, 1); 
        this.game.updateBattleLog(`${this.type} status effect ${effect.type} expired.`);
        this.render(); 
        this.game.renderHands();
      }
      await sleep(250);
    }
  }


  generateRandomAbilities(effectCount, effectPower) {
      const allEffects = this.generateEffects(effectPower)

      for (let i = 0; i < effectCount; i++) {
            const randomEffect = getOptionFromWeightedArray(allEffects);
            let options = [
              {trigger:"onPlay", weight: 2.5},
              {trigger:"endOfTurn", weight:1},
              {trigger:"onDeath", weight: 1},
              {trigger:"onCombatDamage", weight:1}
            ];
          const trigger = getOptionFromWeightedArray(options).trigger;

            if(trigger === 'onPlay') {
                if (!this.onPlayEffect){
                    this.onPlayEffect = [];
                }
                this.onPlayEffect.push(randomEffect);
            } else if (trigger === 'endOfTurn') {
                if (!this.endOfTurnEffect){
                    this.endOfTurnEffect = [];
                }
               this.endOfTurnEffect.push(randomEffect);
             }  else if (trigger === 'onDeath') {
                if (!this.onDeathEffect){
                  this.onDeathEffect = [];
                }
                this.onDeathEffect.push(randomEffect);
            } else if (trigger === 'onCombatDamage') {
                if (!this.combatDamageEffects){
                  this.combatDamageEffects = [];
                }
                this.combatDamageEffects.push(randomEffect);
                //this.continuousEffect = randomEffect;
            }
    }
  }

  generateRandomSpellEffects(effectCount, effectPower) {
      const allEffects = this.generateEffects(effectPower);

      const selectedEffects = [];
      for (let i = 0; i < effectCount; i++) {
        selectedEffects.push(getOptionFromWeightedArray(allEffects));
      }
      return selectedEffects;
  }

  async manageDeathEffects() {
    let isOpponentTeam = this.game.opponentField.includes(this);
    if(this.onDeathEffect){
      for (let effect of this.onDeathEffect) {
              if(typeof effect.action === 'function'){
                await effect.action(this.game, isOpponentTeam, await this.game.selectTargetForAbility(isOpponentTeam, effect));
                this.game.updateBattleLog(`Card death ability: ${effect.text}`);
              } else {
                  this.game.updateBattleLog("Error: death effect has no action.");
              }
          }
    }
  }

  async manageCombatDamageEffects() {
    if(this.combatDamageEffects && this.game.playerLife > 0 && this.game.opponentLife > 0){
      for (let effect of this.combatDamageEffects) {
              if(typeof effect.action === 'function'){
                if (this.game.currentPhaseIndex == 1) {
                  this.activeEffect = true;
                  this.game.renderHands();
                  await sleep(250);
                }
                await effect.action(this.game, this.game.opponentField.includes(this), await this.game.selectTargetForAbility(this.game.opponentField.includes(this), effect));
                this.game.updateBattleLog(`Card combat damage ability: ${effect.text}`);
                this.game.renderHands();
                if (this.game.currentPhaseIndex == 1) {
                  this.activeEffect = false;

                  await sleep(250);
                }
              } else {
                  this.game.updateBattleLog("Error: combat damage effect has no action.");
              }
          }
    }
  }

  kill() {
    let isOpponents = this.game.opponentField.includes(this);
    if(this.game.playerField.includes(this)){
        const index = this.game.playerField.indexOf(this);
          if (index > -1) {
            this.game.playerField.splice(index, 1);
          }
    } else if (this.game.opponentField.includes(this)){
        const index = this.game.opponentField.indexOf(this);
          if (index > -1) {
            this.game.opponentField.splice(index, 1);
          }
    }
    this.resetCard();
    this.render();
    this.game.discardCard(this, isOpponents); 
      this.game.updateBattleLog(`${this.type} is destroyed!`);
  }

  showSpellPopup() {
    const spellPopup = document.getElementById('spell-popup');
    let effectsHtml = this.effect.map(effect => `<div>${effect.text}</div>`).join('');
    spellPopup.innerHTML = `
      <h3>${this.type}</h3>
      ${effectsHtml}
    `;
    spellPopup.classList.add('show');
    setTimeout(() => {
      spellPopup.classList.remove('show');
    }, 2000);
  }

  render(reset = false) {
    let cardElement = document.createElement('div');
    cardElement.classList.add('card', this.rarity.toLowerCase());
    if (this.renderElement != null && !reset) {
      cardElement = this.renderElement;
      cardElement.innerHTML = '';
    } else {
      this.renderElement = cardElement;
    }
    cardElement.card = this;

    if (this.game.selectedCard === this) {
      cardElement.classList.add('attack-selected');
    } else {
      cardElement.classList.remove('attack-selected');
    }

    if (this.hasAttacked) { 
      cardElement.classList.add('exhausted');
    } else {
      cardElement.classList.remove('exhausted');
    }

    if (this.isTarget) {
      cardElement.classList.add('target-selected', "selected");
    } else {
      cardElement.classList.remove('target-selected', "selected");
    }

    if (this.shielded) {
      cardElement.classList.add("shield");
    } else {
      cardElement.classList.remove("shield");
    }

    if (this.activeEffect && !this.isTarget) {
      cardElement.classList.add("effect");
    } else {
      cardElement.classList.remove("effect");
    }

    if (this.abilityIsActive && !this.isTarget) {
      cardElement.classList.add("ability-active");
    } else {
      cardElement.classList.remove("ability-active");
    }
    //console.log(this.game.validTargets);
    //console.log(this.game.isSelectingTarget);
    if ((this.game.isSelectingTarget && this.game.validTargets.includes(this)) || (this.game.sacrificeInProgress && this.game.playerField.includes(this))) {
      cardElement.classList.add('selectable-target');
    } else {
      cardElement.classList.remove('selectable-target');
    }


    if (this.isTribute) {
      cardElement.classList.add('tribute'); 
    } else {
      cardElement.classList.remove('tribute');
    }


    if (this.isSpell) {
        cardElement.classList.add('spell');
        let effectsHtml = '';
        if (this.goAgain)  {
          effectsHtml += `<p><b>GO AGAIN</b></p>`;
        }
        this.effect.forEach(effect => {
          effectsHtml += `<p>${effect.text}</p>`;
        });
        cardElement.innerHTML = `
        <h3 class="autofit">${this.type}</h3>
          ${effectsHtml}
        <span class="rarity">${this.rarity}</span>
      `;
    } else {
        let abilitiesHtml = '';
        if (this.goAgain)  {
          abilitiesHtml += `<p><b>GO AGAIN</b></p>`;
        }
        let kws = '<p>';
        for (let kw of this.keywords) {
          kws += `<span class="keyword ${kw}">${kw}</span>, ` 
        }
        if (kws.endsWith(", ")) {
          kws=kws.slice(0,kws.length-2);
        }
        kws += '</p>'
        abilitiesHtml+= kws;
         if(this.continuousEffect){
            abilitiesHtml += `<p>Continuous: ${this.continuousEffect.text}</p>`;
        }
        if(this.onPlayEffect){
           abilitiesHtml += `<p>On Play: ${this.onPlayEffect.map(e => e.text).join(', ')}</p>`;
        }
        if(this.combatDamageEffects){
          abilitiesHtml += `<p>Combat Damage: ${this.combatDamageEffects.map(e => e.text).join(', ')}</p>`;
       }
        if(this.endOfTurnEffect){
           abilitiesHtml += `<p>End of Turn: ${this.endOfTurnEffect.map(e => e.text).join(', ')}</p>`;
        }
        if(this.onDeathEffect) {
           abilitiesHtml += `<p>On Death: ${this.onDeathEffect.map(e => e.text).join(', ')}</p>`;
        }
        if (this.activatedAbility && this.activatedAbility.text) {
          let p = '<p>';
          if (this.abilityUsedThisTurn) {
            p = '<p class="ability-used">';
          }
          abilitiesHtml += `${p}${this.activatedAbility.text}</p>`;
        }

        cardElement.innerHTML = `
        <h3 class="autofit no-margin">${this.type}</h3>
        <p>${this.power}/${this.defense}</p>
          ${abilitiesHtml}
        <div class="status-effects"></div>
        <span class="rarity">${this.rarity}</span>
      `;
    }

    const statusEffectsContainer = cardElement.querySelector('.status-effects');
    if (statusEffectsContainer) {
    statusEffectsContainer.innerHTML = ''; 
    this.statusEffects.forEach(effect => {
      const effectIcon = document.createElement('span');
      effectIcon.classList.add('status-effect-icon', `status-effect-${effect.type}`);
      effectIcon.textContent = effect.duration;
      effectIcon.title = `${effect.type.toLocaleUpperCase()} (${effect.duration} turns)`; 
      statusEffectsContainer.appendChild(effectIcon);
    });
    }

    return cardElement;
  }

  isPlayable() {
    if (this.isTribute) {
      return this.game.playerField.length >= 2; 
    }
    return true; 
  }

  attack(defendingCard, attackerElement, attackerPosition, targetPosition) {
    if (this.hasStatusEffect('stun')) { 
      this.game.updateBattleLog(`${this.type} is stunned and cannot attack.`);
      return false;
    }
    return new Promise(async (resolve) => {
          if (defendingCard && attackerPosition && targetPosition) {
             this.game.createAttackLine(attackerPosition, targetPosition);
           }

           if (attackerElement && !attackerElement.classList.contains('attacking-animation')) {
                 attackerElement.classList.add('attacking-animation');

                 attackerElement.addEventListener('animationend', () => {
                    attackerElement.classList.remove('attacking-animation');

                }, { once: true });
            }


           if(defendingCard) {
          let damageDealt = this.power;
          let overkill = 0;

          if (this.keywords.includes("leeching")) {
            this.game.gainLife(damageDealt, !this.game.opponentField.includes(defendingCard));
            this.game.updateBattleLog(`${this.type} leeching heals for ${damageDealt} life!`);
          }

          if (this.keywords.includes("trample")) {
            overkill = Math.max(0, this.power - defendingCard.defense);
            damageDealt = defendingCard.defense;
            if (overkill > 0) {
              let isOpponent = this.game.opponentField.includes(this);
              this.game.dealDamage(overkill, isOpponent);
              this.game.updateBattleLog(`${this.type} tramples for ${overkill} damage!`);
              this.game.createAttackLine(attackerPosition, document.getElementById(isOpponent?"player-life":"opponent-life").getBoundingClientRect());
              this.game.checkGameOver();
              await this.manageCombatDamageEffects();
            }
          }

          resolve(await defendingCard.takeDamage(damageDealt));


        } else {
          resolve(false);
        }
    });
  }
}

class Game {
  constructor() {
    this.playerHand = [];
    this.opponentHand = [];
    this.playerField = [];
    this.opponentField = [];
    this.playerDiscardPile = []; 
    this.opponentDiscardPile = [];
    this.playerExilePile = []; 
    this.opponentExilePile = [];
    this.currentTurn = 'player';
    this.selectedCard = null;
    this.playerLife = 20;
    this.opponentLife = 20;
    this.cardPlayedThisTurn = false;
      this.cardsToDiscard = 0;
      this.discardPile = [];
      this.discardPhaseActive = false;
      this.discardedCardCount = 0;

    this.phases = ['draw', 'play', 'attack', 'end'];
    this.currentPhaseIndex = 0;
    this.directAttackButton = null;
      this.discardButton = null;
      this.selectedTarget = null;
      this.continuousEffects = [];
      this.discardText = null;
      this.discardCardForAbility = false;
      this.canDeclareAttack = true;
      this.turnChangePopup = null;
      this.resetButton = null;
      this.helpButton = null;
      this.helpModal = null;
      this.closeHelpButton = null;
      this.targetSelectionPopup = null;
      this.isSelectingTarget = false;
      this.targetSelectionResolve = null;
      this.validTargets = [];
      this.discardPileModal = null; 
      this.closeDiscardModalButton = null;
      this.exilePileModal = null; 
      this.closeExileModalButton = null;
      this.deckManipulationModal = null;
      this.deckManipulationCards = [];
      this.deckManipulationResolve = null;
      this.deckManipulationInstructions = null;
      this.closeDeckManipulationModalButton = null;
      this.sacrificeInProgress = false; 
      this.tributeCardToPlay = null; 
      this.sacrificesSelected = [];

    this.canPlayCard = true;
    this.playerDeck = []; 
    this.opponentDeck = []; 
    this.initialPlayerDeck = []; 
    this.initialOpponentDeck = []; 

    this.upgradeModal = null;
    this.newCards = [];
    this.setupUpgradeModal();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeGame());
    } else {
      this.initializeGame();
    }
  }

  setupUpgradeModal() {
    this.upgradeModal = document.getElementById('upgrade-modal');
    const readyButton = document.getElementById('ready-button');
    readyButton.addEventListener('click', () => this.finishUpgrade());

    this.setupDragAndDrop();
  }

  getAllCardsOnField() {
    if (this.currentTurn === "player") {
      return [...this.playerField, ...this.opponentField];
    }
    return [...this.opponentField, ...this.playerField];
  }

  setupDragAndDrop() {
    const currentDeck = document.getElementById('current-deck');
    const newCards = document.getElementById('new-cards');

    currentDeck.addEventListener('dragover', e => {
      e.preventDefault();
      const dragging = document.querySelector('.dragging');
      if (dragging) {
        const afterElement = this.getDragAfterElement(currentDeck, e.clientY);
        if (afterElement) {
          currentDeck.insertBefore(dragging, afterElement);
        } else {
          currentDeck.appendChild(dragging);
        }
      }
    });

    newCards.addEventListener('dragover', e => {
      e.preventDefault();
      const dragging = document.querySelector('.dragging');
      if (dragging) {
        const afterElement = this.getDragAfterElement(newCards, e.clientY);
        if (afterElement) {
          newCards.insertBefore(dragging, afterElement);
        } else {
          newCards.appendChild(dragging);
        }
      }
    });

    this.updateDeckCount();
  }

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  resetGame(hadWinner=false, playerWon=false) {
    this.playerHand = [];
    this.opponentHand = [];
    this.playerField = [];
    this.opponentField = [];
    this.playerDiscardPile = [];
    this.opponentDiscardPile = [];
    this.playerExilePile = [];
    this.opponentExilePile = [];
    this.currentTurn = Math.random() < 0.5?'player':"opponent";
    if (hadWinner) {
      this.currentTurn = !playerWon ? 'player' : 'opponent';
    }
    this.selectedCard = null;
    this.playerLife = 20;
    this.opponentLife = 20;
    this.cardPlayedThisTurn = false;
      this.cardsToDiscard = 0;
      this.discardPile = [];
      this.discardPhaseActive = false;
      this.discardedCardCount = 0;

    this.phases = ['draw', 'play', 'attack', 'end'];
    this.currentPhaseIndex = 0;
    this.continuousEffects = [];
    this.discardText.textContent = "";
    this.discardCardForAbility = false;
    this.canDeclareAttack = true;
    this.isSelectingTarget = false;
    this.targetSelectionPopup.classList.remove('show');


    this.canPlayCard = true;
    this.playerDeck = [...this.initialPlayerDeck]; 
    this.opponentDeck = [...this.initialOpponentDeck]; 
    this.playerDeck = shuffleArray(this.playerDeck);
    this.opponentDeck = shuffleArray(this.opponentDeck);

    for (let c of this.playerDeck) {
      c.resetCard();
    }
    for (let c of this.opponentDeck) {
      c.resetCard();
    }
    this.drawCard(5); 
    this.drawCard(5, true); 
    this.renderHands();
    this.updateLifeDisplay();
    this.updatePhaseDisplay();
    if (this.currentTurn == "opponent") {
      this.opponentTurn();
    } else {
      this.showTurnChangePopup('Your Turn');
    }
  }

  initializeGame() {
    this.turnChangePopup = document.getElementById('turn-change-popup');
    this.resetButton = document.getElementById('reset-button');
    this.helpButton = document.getElementById('help-button');
    this.helpModal = document.getElementById('help-modal');
    this.closeHelpButton = document.querySelector('.close-button');
    this.discardText = document.getElementById('discard-text');
    this.targetSelectionPopup = document.getElementById('target-selection-popup');
      this.discardPileModal = document.getElementById('discard-pile-modal');
      this.closeDiscardModalButton = document.getElementById('close-discard-modal');
      this.exilePileModal = document.getElementById('exile-pile-modal');
      this.closeExileModalButton = document.getElementById('close-exile-modal');
      this.deckManipulationModal = document.getElementById('deck-manipulation-modal');
      this.deckManipulationInstructions = document.getElementById('deck-manipulation-instructions');
      this.closeDeckManipulationModalButton = document.getElementById('close-deck-manipulation-modal');


    this.initializeDeck(this.initialPlayerDeck, 40, 'initial'); 
    this.initializeDeck(this.initialOpponentDeck, 40, 'initial'); 
    this.resetGame(); 


    this.setupEventListeners();

    this.directAttackButton = document.getElementById('direct-attack-button');
    if (this.directAttackButton) {
      this.directAttackButton.addEventListener('click', () => this.playerDirectAttack());
      this.directAttackButton.style.display = 'none';
    }

      this.discardButton = document.getElementById('discard-button');

      if(this.discardButton) {
        this.discardButton.addEventListener('click', () => this.completeDiscard());
          this.discardButton.style.display = 'none';
      }

      this.closeDiscardModalButton.addEventListener('click', () => this.hideDiscardPileModal());
      window.addEventListener('click', (event) => {
        if (event.target == this.discardPileModal) {
          this.hideDiscardPileModal();
        }
      });

      this.closeExileModalButton.addEventListener('click', () => this.hideExilePileModal());
      window.addEventListener('click', (event) => {
        if (event.target == this.exilePileModal) {
          this.hideExilePileModal();
        }
      });
      document.getElementById("close-deck-manipulation-modal-button").addEventListener('click', () => this.hideDeckManipulationModal());
      this.closeDeckManipulationModalButton.addEventListener('click', () => this.hideDeckManipulationModal());
      window.addEventListener('click', (event) => {
        if (event.target == this.deckManipulationModal) {
          this.hideDeckManipulationModal();
        }
      });
  }


  setupEventListeners() {
    const nextPhaseButton = document.getElementById('next-phase');
    if (nextPhaseButton) {
      nextPhaseButton.addEventListener('click', async () => await this.advancePhase());
    }
    if (this.resetButton) {
      this.resetButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to reset?")) {
          this.resetGame();
        }
      });
    }
    if (this.helpButton) {
      this.helpButton.addEventListener('click', () => this.helpModal.style.display = "block");
    }
    if (this.closeHelpButton) {
      this.closeHelpButton.addEventListener('click', () => this.helpModal.style.display = "none");
    }
    window.addEventListener('click', (event) => {
      if (event.target == this.helpModal) {
        this.helpModal.style.display = "none";
      }
    });
  }

  

  updatePhaseDisplay() {
    const phaseSteps = document.querySelectorAll('.phase-step');
    phaseSteps.forEach((step, index) => {
      step.classList.toggle('active', index === this.currentPhaseIndex);
      if (this.currentTurn === "opponent" && index === this.currentPhaseIndex) {
        step.style.backgroundColor = "red";
      } else {
        step.style.backgroundColor = "";
      }
    });
    document.getElementById("turn-indicator").textContent = this.currentTurn.toLocaleUpperCase();
    const currentPhaseElement = document.getElementById('current-phase');
    currentPhaseElement.textContent = this.phases[this.currentPhaseIndex];
  }

  async advancePhase(override) {
      if (!this.canPlayCard) {
        return;
      }
      if(this.discardPhaseActive && this.currentTurn === 'player') {
          this.updateBattleLog("Please select cards to discard before advancing.");
        return;
      }
      if (this.currentTurn === "opponent") {
        return;
      }

    switch(this.phases[this.currentPhaseIndex]) {
      case 'draw':
        this.drawCard();
        this.currentPhaseIndex = 1;
        break;
      case 'play':
        this.currentPhaseIndex = 2;
        break;
      case 'attack':
        this.playerField.forEach(card => card.hasAttacked = false);
        this.playerField.forEach(card => card.abilityUsedThisTurn = false);
        this.cardPlayedThisTurn = false;
        this.selectedCard = null;
        this.renderHands();
        this.currentPhaseIndex = 3;
        break;
      case 'end':
          await this.endTurnEffects();
        return;

    }

    this.updateNextPhaseButton();
    this.currentPhaseIndex = this.currentPhaseIndex % this.phases.length;
    this.updatePhaseDisplay();
    this.renderHands();
  }

  drawCard(amount = 1, isOpponent = false) {
      const hand = isOpponent ? this.opponentHand : this.playerHand;
      const deck = isOpponent ? this.opponentDeck : this.playerDeck;
      for(let i = 0; i < amount; i++){
          if (deck.length > 0) {
              const drawnCard = deck.pop(); 
              drawnCard.game = this;
              hand.push(drawnCard);
          } else {
              this.checkDeckDepletion(isOpponent); 
              break; 
          }
      }

    this.renderHands();
  }

    checkDeckDepletion(isOpponent) {
        if (isOpponent) {
            if (this.opponentDeck.length === 0) {
                alert('Game Over! Player Wins! Opponent deck depleted.');
                this.resetGame();
            }
        } else {
            if (this.playerDeck.length === 0) {
                alert('Game Over! Opponent Wins! Your deck depleted.');
                this.showUpgradeMenu(); 
                //this.resetGame();
            }
        }
    }

  initializeDeck(deck, count, deckType = 'default') {
    for (let i = 0; i < count; i++) {
      const newCard = new Card();
        newCard.game = this;
      deck.push(newCard.generateRandomCard(deckType)); 
    }
  }

  async playCard(card, hand, field, override) {
    if ((this.currentTurn !== 'player' ||
        this.phases[this.currentPhaseIndex] !== 'play' ||
        this.cardPlayedThisTurn)){
          if (override == undefined || !override)
            return;
    }

    if (!card.isTribute) {
      if (field.length >= 5 && card.type != "Spell") {return;}
    }

    if (card.isTribute && field.length < 2) {
      this.updateBattleLog("You must have two cards on your field to sacrifice!");
      return;
    }

    this.canPlayCard = false;
    const index = hand.indexOf(card);
    if (index > -1 && card.isPlayable()) {
      hand.splice(index, 1);
      if (card.isTribute) {
        if (field.length >= 2) {
          this.sacrificeInProgress = true;
          this.tributeCardToPlay = card;
          this.updateBattleLog(`Select two creatures to sacrifice for ${card.type}.`);
          this.renderHands(); // Re-render to highlight selectable cards
          return; // Wait for player to select sacrifices
        } else {
          this.updateBattleLog(`Cannot play ${card.type}: Not enough creatures to sacrifice.`);
          this.canPlayCard = true;
          this.renderHands();
          this.updateNextPhaseButton();
          return;
        }
      }
        if (card.isSpell) {
            await this.activateSpell(card, false);
            this.discardCard(card, false); // Discard spell after playing
        } else {
          card.resetCard();
          field.push(card);
          
            if(card.continuousEffect){
              this.continuousEffects.push({ card: card, isOpponent: false });
            }
            this.renderHands();
            if(card.onPlayEffect){
                for (let effect of card.onPlayEffect) {
                    if(typeof effect.action === 'function'){
                        card.activeEffect = true;
                        this.renderHands();

                        await sleep(250);
                        this.updateBattleLog(`Card played with ability: ${effect.text}`);
                        await effect.action(this, false, await this.selectTargetForAbility(false, effect));
                        
                        card.activeEffect = false;
                        this.renderHands();
                        await sleep(250);
                    } else {
                        this.updateBattleLog("Error: onPlay spell has no action.");
                    }
                }
            }
        }
      this.renderHands();
      if (!card.goAgain) {
        this.cardPlayedThisTurn = true;
      }
      this.canPlayCard = true;
      this.updateNextPhaseButton();
    }

  }

  async activateSpell(card, isOpponent){
      card.showSpellPopup();
      if (card.effect && Array.isArray(card.effect)) {
        for (let effect of card.effect) {
          if(typeof effect.action === 'function'){
            await effect.action(this, isOpponent, await this.selectTargetForAbility(isOpponent, effect));
            this.renderHands();
            this.updateBattleLog(`Spell cast: ${effect.text}`);
            await sleep(1000);
          } else {
             this.updateBattleLog("Error: spell has no action or is not an array.");
          }
        }
      } else {
        this.updateBattleLog("Error: spell has no action or is not an array.");
      }
    }

    discardCard(card, isOpponent) {
        const discardPile = isOpponent ? this.opponentDiscardPile : this.playerDiscardPile;
        if (card.type != "Token") {
          discardPile.push(card);
        }
    }

    exileCard(card, isOpponent) {
        const exilePile = isOpponent ? this.opponentExilePile : this.playerExilePile;
        exilePile.push(card);
    }

  async gainLife(amount, isOpponent = false) {
    if (isOpponent) {
      this.opponentLife += amount;
    } else {
      this.playerLife += amount;
    }
      this.updateLifeDisplay();
  }

  async dealDamage(amount, isOpponent = false) {
    if (isOpponent) {
      this.playerLife -= amount;
    } else {
        this.opponentLife -= amount;
    }
      this.updateLifeDisplay();
      this.checkGameOver();
  }

  async opponentLoseLife(amount, isOpponent = false) {
    if (isOpponent) {
      this.playerLife -= amount;
    } else {
        this.opponentLife -= amount;
    }
    this.updateLifeDisplay();
    this.checkGameOver();
  }

  async stealLife(amount, isOpponent = false) {
    if (isOpponent) {
      this.playerLife -= amount;
      this.opponentLife += amount;
      this.updateBattleLog(`Opponent steals ${amount} life!`);
    } else {
        this.opponentLife -= amount;
        this.playerLife += amount;
        this.updateBattleLog(`You steal ${amount} life!`);
    }
    this.updateLifeDisplay();
    this.checkGameOver();
  }


  async dealDamageToCard(amount, target){
      if(target){
          this.updateBattleLog(`${target.type} takes ${amount} damage!`)
           await target.takeDamage(amount);
            this.renderHands();
      }
  }

  async dealDamageToAllCards(amount, isOpponent){
        const field = isOpponent ? this.playerField : this.opponentField;
        let allCardsInPlay = [];

        this.playerField.forEach(card => {
            allCardsInPlay.push(card);
        });
      this.opponentField.forEach(card => {
              allCardsInPlay.push(card);
        });

        for (let c of allCardsInPlay) {
          await c.takeDamage(amount);
        }
        this.renderHands();
    }

    async healCard(amount, target){
        if(target) {
            target.defense += amount;
            target.renderDamageNumber(-amount);
             this.updateBattleLog(`${target.type} is healed for ${amount}!`);
           this.renderHands();
        }
    }

    async buffCardAttack(amount, target){
        if(target) {
            target.power += amount;
             this.updateBattleLog(`${target.type}'s attack is increased by ${amount}!`);
           this.renderHands();
        }
    }

    async buffCardDefense(amount, target){
        if(target) {
            target.defense += amount;
            target.renderDamageNumber(-amount);
             this.updateBattleLog(`${target.type}'s defense is increased by ${amount}!`);
           this.renderHands();
        }
    }

    async destroyRandomCard(isOpponent = false) {
        const field = isOpponent ? this.playerField : this.opponentField;
        if (field.length > 0) {
           const target = field[Math.floor(Math.random() * field.length)];
            const index = field.indexOf(target);
             if (index > -1) {
                  await target.manageDeathEffects();
                  target.kill();
                  //field.splice(index, 1);

                 this.updateBattleLog(`${target.type} was destroyed!`);
            }
            this.renderHands();
        }
    }

    async exileRandomDiscard(isOpponent = false) {
      const discardPile = isOpponent ? this.playerDiscardPile : this.opponentDiscardPile;
      if (discardPile.length > 0) {
        const cardToExile = discardPile.pop(); 
        this.exileCard(cardToExile, !isOpponent); 
        this.updateBattleLog(`Exiled a random card from opponent's discard pile.`);
        this.renderHands();
      } else {
        this.updateBattleLog(`Opponent's discard pile is empty, no card to exile.`);
      }
    }

    async lookAtDeck(amount, isOpponent = false) {
      const deck = isOpponent ? this.opponentDeck : this.playerDeck;
      if (deck.length === 0) {
        this.updateBattleLog("Your deck is empty.");
        return false;
      }
      const cardsToView = deck.slice(deck.length - amount).reverse(); 

      if (!isOpponent) {
        this.deckManipulationCards = [...cardsToView];
        this.deckManipulationInstructions.textContent = `Rearrange the top ${amount} cards of your deck. Drag to reorder, then click Done.`;
        this.showDeckManipulationModal();

        return new Promise((resolve) => {
          this.deckManipulationResolve = resolve;
        });
      } else {
        this.updateBattleLog(`Opponent looks at the top cards of their deck.`);
        return true;
      }
    }

    async tutorCardToHand(isOpponent) {
      return new Promise((resolve) => {
        if (!isOpponent) {
          this.isSelectingTarget = true; 
          this.targetSelectionResolve = resolve;
          this.validTargets = [...this.playerDeck]; 
          this.targetSelectionPopup.textContent = "Choose a card to tutor from your deck";
          this.targetSelectionPopup.classList.add('show');
          this.renderHands();
        }
      });
    }

    async resurrectCardFromDiscard(isOpponent) {
      return new Promise((resolve) => {
        if (!isOpponent) {
          this.isSelectingTarget = true; 
          const discardPile = this.playerDiscardPile;
          if (discardPile.length === 0) {
            this.updateBattleLog("Your discard pile is empty.");
            resolve(false);
            return;
          }
          this.validTargets = [...discardPile]; 
          this.targetSelectionResolve = resolve;
          this.targetSelectionPopup.textContent = "Choose a card to resurrect from your discard pile";
          this.targetSelectionPopup.classList.add('show');
          this.renderHands();
        }
      });
    }

    async destroyAllOtherCards(isOpponent) {
      const playerField = this.playerField;
      const opponentField = this.opponentField;
      const sourceField = isOpponent ? opponentField : playerField;

      const allCards = [...playerField, ...opponentField];
      for (let card of allCards) {
        if (!sourceField.includes(card)) { 
          await card.takeDamage(card.defense + 99); 
        }
      }
      this.renderHands();
    }
    async createToken(power, isOpponent = false, size=3) {
      const field = isOpponent ? this.opponentField : this.playerField;
      if (field.length < 5) {
        const tokenCard = new Card('Token', size, size, 'Common');
        tokenCard.game = this;
        tokenCard.generateRandomAbilities(1, power);
          field.push(tokenCard);
        this.renderHands();
        if(tokenCard.onPlayEffect){
          for (let effect of tokenCard.onPlayEffect) {
              if(typeof effect.action === 'function'){
                tokenCard.activeEffect = true;
                  this.renderHands();

                  await sleep(250);
                  this.updateBattleLog(`Token created with ability: ${effect.text}`);
                  await effect.action(this, isOpponent, await this.selectTargetForAbility(isOpponent, effect));
                  
                  tokenCard.activeEffect = false;
                  this.renderHands();
                  await sleep(250);
              } else {
                  this.updateBattleLog("Error: onPlay spell has no action.");
              }
          }
        }
      }
  }

  async  deathDamage(amount, isOpponent) {
    if(isOpponent) {
        this.playerLife -= amount;
    } else {
        this.opponentLife -= amount;
    }
     this.updateLifeDisplay();
    this.checkGameOver();
}

async deathHeal(amount, isOpponent) {
    if(isOpponent) {
        this.opponentLife += amount;
    } else {
        this.playerLife += amount;
    }
    this.updateLifeDisplay();
}

async continuousBuffAllAttack(amount, isOpponent) {
     const field = isOpponent ? this.opponentField : this.playerField;
    field.forEach(card => {
        card.power += amount;
    });
}

async continuousBuffAllDefense(amount, isOpponent) {
    const field = isOpponent ? this.opponentField : this.playerField;
     field.forEach(card => {
        card.defense += amount;
    });
}

async continuousDebuffAllAttack(amount, isOpponent) {
     const field = isOpponent ? this.playerField : this.opponentField;
     field.forEach(card => {
        card.power -= amount;
        if (card.power < 0) {
          card.power = 0;
        }
    });
}

async continuousDebuffAllDefense(amount, isOpponent) {
    const field = isOpponent ? this.playerField : this.opponentField;
     for (let card of field) {
        await card.takeDamage(amount);
    }
}

gainLifeAndBuffCardDefense(lifeAmount, defenseAmount, isOpponent, target) {
  this.gainLife(lifeAmount, isOpponent);
  this.buffCardDefense(defenseAmount, target);
}

dealDamageToRandomEnemyCardAndDraw(damageAmount, isOpponent) {
  const field = isOpponent ? this.playerField : this.opponentField;
  if (field.length > 0) {
    const target = field[Math.floor(Math.random() * field.length)];
    this.dealDamageToCard(damageAmount, target);
  }
  this.drawCard(1, !isOpponent);
}

  showUpgradeMenu() {
    this.newCards = [];
    for (let i = 0; i < 8; i++) {
      const card = new Card();
      card.game = this;
      this.newCards.push(card.generateRandomCard('upgrade'));
    }

    const currentDeckElement = document.getElementById('current-deck');
    const newCardsElement = document.getElementById('new-cards');

    while (this.playerField.length > 0) {
      this.playerField.splice(0, 1);
    }

    while (this.playerHand.length > 0) {
      this.playerHand.splice(0, 1);
    }

    currentDeckElement.innerHTML = '';
    newCardsElement.innerHTML = '';

    this.initialPlayerDeck.sort((a, b) => {
      const rarityOrder = ['Common', 'Rare', 'Epic', 'Legendary', 'Holy'];
      let i = rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
      if (i == 0) {
        i = a.type.localeCompare(b.type);
      }
      if (i == 0 && a.type !== "Spell") {
        i = a.power - b.power;
      }

      return i;
    });
    this.initialPlayerDeck.forEach(card => {
      card.resetCard();
      card.render();
      const cardElement = card.render();
      cardElement.classList.add('draggable-card');
      cardElement.draggable = true;
      cardElement.addEventListener('dragstart', () => {
        cardElement.classList.add('dragging');
      });
      cardElement.addEventListener('dragend', () => {
        cardElement.classList.remove('dragging');
        this.updateDeckCount();
      });
       currentDeckElement.appendChild(cardElement);

    });


    this.newCards.forEach(card => {
      const cardElement = card.render();
      cardElement.classList.add('draggable-card');
      cardElement.draggable = true;
      cardElement.addEventListener('dragstart', () => {
        cardElement.classList.add('dragging');
      });
      cardElement.addEventListener('dragend', () => {
        cardElement.classList.remove('dragging');
        this.updateDeckCount();
      });
      newCardsElement.appendChild(cardElement);
    });

    this.upgradeModal.style.display = 'flex';
    this.updateDeckCount();
  }

  updateDeckCount() {
    const currentDeckElement = document.getElementById('current-deck');
    const count = currentDeckElement.children.length;
    document.getElementById('deck-count').textContent = count;
    const readyButton = document.getElementById('ready-button');
    const warning = document.getElementById('deck-warning');

    if (count === 40) {
      readyButton.disabled = false;
      warning.textContent = '';
    } else {
      readyButton.disabled = true;
      warning.textContent = `Your deck must contain exactly 40 cards (currently ${count})`;
    }
  }

  finishUpgrade() {
    const currentDeckElement = document.getElementById('current-deck');
    const newDeck = [];

    for (const cardElement of currentDeckElement.children) {
      const card = cardElement.card;
      newDeck.push(card);
    }

    if (newDeck.length === 40) {
      this.initialPlayerDeck = newDeck;
      this.upgradeModal.style.display = 'none';
      this.resetGame(true, false);
    }
  }

  updateNextPhaseButton() {
    let hasAbility = false;
    for (let card of this.playerField) {
      if ((card.activatedAbility != null && !card.abilityUsedThisTurn)) {
        hasAbility = true;
        break;
      }
    }

    let canAttack = false;
    for (let card of this.playerField) {
      if (!card.hasAttacked) {
        canAttack = true;
        break;
      }
    }

    let hasPlayableCard = this.playerField.length < 5;
    for (let card of this.playerHand) {
      if (card.isPlayable() || card.isSpell) {
        hasPlayableCard = true;
        break;
      }
    }

    const nextPhaseButton = document.getElementById('next-phase');
    if(this.currentTurn === 'player' && this.currentPhaseIndex==1 && !hasAbility && this.cardPlayedThisTurn && hasPlayableCard) {
      nextPhaseButton.style.backgroundColor = "blue";
    } else if (this.currentTurn === 'player' && this.currentPhaseIndex == 2 && !canAttack ) {
      nextPhaseButton.style.backgroundColor = "blue";
    }else {
      nextPhaseButton.style.backgroundColor = "";
    }
  }

  checkGameOver() {
    if (this.playerLife <= 0) {
      alert('Game Over! Opponent Wins!');
      this.showUpgradeMenu(); 
      //this.resetGame();
    } else if (this.opponentLife <= 0) {
      alert('Congratulations! You Win!');
      this.upgradeOpponentDeck();
      this.resetGame(true, true);
    }
  }

  upgradeOpponentDeck() {
    const newCards = [];
    for (let i = 0; i < 8; i++) {
      const card = new Card();
      card.game = this;
      newCards.push(card.generateRandomCard('upgrade'));
    }

    this.initialOpponentDeck.sort((a, b) => {
      const rarityOrder = ['Common', 'Rare', 'Epic', 'Legendary', 'Holy'];
      let i = rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
      if (i == 0) {
        i = a.type.localeCompare(b.type);
      }
      if (i == 0 && a.type !== "Spell") {
        i = a.power - b.power;
      }
      return i;
    });

    let cardsToRemove = 5;
    let currentIndex = 0;

    this.initialOpponentDeck.sort((a, b) => {
      const rarityOrder = ['Common', 'Rare', 'Epic', 'Legendary', 'Holy'];
      return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
    });
    while (cardsToRemove > 0) {
      this.initialOpponentDeck.splice(0,1);
      cardsToRemove--;
    }

    for (let i = 0; i < 5; i++) {
      this.initialOpponentDeck.push(newCards[i]);
    }

    this.updateBattleLog("Opponent's deck has been upgraded with new cards!");
  }

  updateLifeDisplay() {
    document.getElementById('player-life').textContent = this.playerLife;
    document.getElementById('opponent-life').textContent = this.opponentLife;
  }

  renderHands() {
    const playerHandElement = document.getElementById('player-hand');
    const opponentHandElement = document.getElementById('opponent-hand');
    const playerFieldElement = document.getElementById('player-field');
    const opponentFieldElement = document.getElementById('opponent-field');
    const playerExilePileElement = document.getElementById('player-exile-pile');
    const opponentExilePileElement = document.getElementById('opponent-exile-pile');

    document.getElementById('player-deck-size').textContent = this.playerDeck.length; 
    document.getElementById('opponent-deck-size').textContent = this.opponentDeck.length;

    playerHandElement.innerHTML = '';
    opponentHandElement.innerHTML = '';
    playerFieldElement.innerHTML = '';
    opponentFieldElement.innerHTML = '';
    playerExilePileElement.innerHTML = `Exile Pile (${this.playerExilePile.length} cards)`;
    opponentExilePileElement.innerHTML = `Exile Pile (${this.opponentExilePile.length} cards)`;


    this.playerHand.forEach(card => {
      const cardElement = card.render();
      if (!card.hooks.includes("hand-click")) {
        card.hooks.push("hand-click")
        cardElement.addEventListener('click', () => {if (this.playerHand.includes(card)) this.handleCardClick(card, this.playerHand, this.playerField, true)})
      }
      playerHandElement.appendChild(cardElement);
      if (card.toDiscard) {
        cardElement.classList.add('selected','discard-selected');
      } else {
        cardElement.classList.remove('selected','discard-selected');
      }
    });

    this.opponentHand.forEach(() => {
      const hiddenCard = document.createElement('div');
      hiddenCard.classList.add('card', 'hidden-card');
      opponentHandElement.appendChild(hiddenCard);
    });

    this.playerField.forEach(card => {
      const cardElement = card.render();
      if (!card.hooks.includes("field-click")) {

        card.hooks.push("field-click");

        cardElement.addEventListener('click', async () => {
          if (this.sacrificeInProgress) {
            await this.selectCardForSacrifice(card);
          }
          if (this.isSelectingTarget && this.validTargets.includes(card)) {
            if (this.targetSelectionResolve) {
              this.targetSelectionResolve(card);
              this.targetSelectionResolve = null;
              this.isSelectingTarget = false;
              this.targetSelectionPopup.classList.remove('show');
              this.validTargets = [];
              this.renderHands();
              return;
            }
          }
          if (this.phases[this.currentPhaseIndex] === 'play' && this.currentTurn === 'player') {
             /*else {
              await this.selectCardForAttack(card);
            }*/
              this.handleCardClick(card, this.playerHand, this.playerField, false);
          } else {
            await this.selectCardForAttack(card);
          }
          this.renderHands();
        });
      }
      
      playerFieldElement.appendChild(cardElement);
    });

    this.opponentField.forEach(card => {
      const cardElement = card.render();
      if (!card.hooks.includes("opponent-click")) {
        card.hooks.push("opponent-click");
        cardElement.addEventListener('click', async () => {
          if (this.isSelectingTarget && this.validTargets.includes(card)) {
            if (this.targetSelectionResolve) {
              this.targetSelectionResolve(card);
              this.targetSelectionResolve = null;
              this.isSelectingTarget = false;
              this.targetSelectionPopup.classList.remove('show');
              this.validTargets = [];
              this.renderHands();
              return;
            }
          }
          await this.attackOpponentCard(card)
        });
      }
      opponentFieldElement.appendChild(cardElement);
    });

    if (this.directAttackButton) {
      if (this.currentTurn === 'player' &&
          this.phases[this.currentPhaseIndex] === 'attack' &&
          this.opponentField.length === 0) {
        this.directAttackButton.style.display = 'block';
      } else {
        this.directAttackButton.style.display = 'none';
      }
    }

     if(this.discardPhaseActive) {
          if (this.currentTurn === 'player') {
               this.discardButton.style.display = 'inline-block';
               this.discardText.textContent = "Discard " + (this.playerHand.length - 7) + " cards";
            } else {
               this.discardButton.style.display = 'none';
           }
      }

      this.updateNextPhaseButton();
      this.renderDiscardPiles(); 
      this.renderExilePiles(); 
  }

  renderDiscardPiles() {
    const playerDiscardPileElement = document.getElementById('player-discard-pile');
    const opponentDiscardPileElement = document.getElementById('opponent-discard-pile');

    playerDiscardPileElement.innerHTML = `Discard Pile (${this.playerDiscardPile.length} cards)`;
    opponentDiscardPileElement.innerHTML = `Discard Pile (${this.opponentDiscardPile.length} cards)`;

    playerDiscardPileElement.onclick = () => this.showDiscardPileModal(true);
    opponentDiscardPileElement.onclick = () => this.showDiscardPileModal(false);
  }

  renderExilePiles() {
    const playerExilePileElement = document.getElementById('player-exile-pile');
    const opponentExilePileElement = document.getElementById('opponent-exile-pile');

    playerExilePileElement.innerHTML = `Exile Pile (${this.playerExilePile.length} cards)`;
    opponentExilePileElement.innerHTML = `Exile Pile (${this.opponentExilePile.length} cards)`;

    playerExilePileElement.onclick = () => this.showExilePileModal(true);
    opponentExilePileElement.onclick = () => this.showExilePileModal(false);
  }

  showDiscardPileModal(isPlayer) {
    const modal = document.getElementById('discard-pile-modal');
    const cardsContainer = document.getElementById('discard-pile-cards');
    const discardPile = isPlayer ? this.playerDiscardPile : this.opponentDiscardPile;

    cardsContainer.innerHTML = '';
    discardPile.forEach(card => {
      const cardElement = card.render();
      cardsContainer.appendChild(cardElement);
    });

    modal.style.display = 'block';
  }

  hideDiscardPileModal() {
    const modal = document.getElementById('discard-pile-modal');
    modal.style.display = 'none';
  }

  showExilePileModal(isPlayer) {
    const modal = document.getElementById('exile-pile-modal');
    const cardsContainer = document.getElementById('exile-pile-cards');
    const exilePile = isPlayer ? this.playerExilePile : this.opponentExilePile;

    cardsContainer.innerHTML = '';
    exilePile.forEach(card => {
      const cardElement = card.render();
      cardsContainer.appendChild(cardElement);
    });

    modal.style.display = 'block';
  }

  hideExilePileModal() {
    const modal = document.getElementById('exile-pile-modal');
    modal.style.display = 'none';
  }

  showDeckManipulationModal() {
    const modal = document.getElementById('deck-manipulation-modal');
    const cardsContainer = document.getElementById('deck-manipulation-cards');

    cardsContainer.innerHTML = '';
    this.deckManipulationCards.forEach((card, index) => {
      const cardElement = card.render();
      cardElement.classList.add('draggable-card');
      cardElement.draggable = true;
      cardElement.setAttribute('data-position', index === this.deckManipulationCards.length - 1 ? 'Top' : '');
      if (index === 0) {
        cardElement.classList.add('bottom');
      } else if (index === this.deckManipulationCards.length - 1) {
        cardElement.classList.add('top');
      }
      cardElement.addEventListener('dragstart', () => {
        cardElement.classList.add('dragging');
      });
      cardElement.addEventListener('dragend', () => {
        cardElement.classList.remove('dragging');
      });
      cardsContainer.appendChild(cardElement);
    });
 
    modal.style.display = 'flex'; // Use flex to properly display modal

    // Add dragover and drop event listeners
    cardsContainer.addEventListener('dragover', this.handleDragOver.bind(this));
    cardsContainer.addEventListener('drop', this.handleDrop.bind(this));
  }

  handleDragOver(e) {
    e.preventDefault();

    const cardsContainer = document.getElementById('deck-manipulation-cards');
    const draggingCard = document.querySelector('.dragging');
    if (draggingCard) {
      const afterElement = this.getDragAfterElementDeck(e.clientX, e.clientY);
      if (afterElement == null) {
        cardsContainer.appendChild(draggingCard);
      } else {
        cardsContainer.insertBefore(draggingCard, afterElement);
      }
    }
  }

  handleDrop(e) {
    e.preventDefault();
    const cardsContainer = document.getElementById('deck-manipulation-cards');
    const updatedCards = Array.from(cardsContainer.children).map(cardElement => cardElement.card);
    this.deckManipulationCards = updatedCards;

    // Update data-position attributes
    this.deckManipulationCards.forEach((card, index) => {
      const cardElement = cardsContainer.children[index];
      cardElement.setAttribute('data-position', index === this.deckManipulationCards.length - 1 ? 'Top' : '');
      cardElement.classList.remove('top', 'bottom');
      if (index === 0) {
        cardElement.classList.add('bottom');
      } else if (index === this.deckManipulationCards.length - 1) {
        cardElement.classList.add('top');
      }
    });
  }

  getDragAfterElementDeck(x, y) {
    const draggableElements = [...document.getElementById('deck-manipulation-cards').querySelectorAll('.card')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offsetX = x - box.left - box.width / 2;
      const offsetY = y - box.top - box.height / 2;
      if (offsetX < 0 && offsetY > 0 && offsetX > closest.offsetX) {
        return { offsetX: offsetX, element: child };
      } else {
        return closest;
      }
    }, { offsetX: Number.NEGATIVE_INFINITY }).element;
  }

  hideDeckManipulationModal() {
    const modal = document.getElementById('deck-manipulation-modal');
    modal.style.display = 'none';

    const cardsContainer = document.getElementById('deck-manipulation-cards');
    const rearrangedDeckCards = [];
    for (const cardElement of cardsContainer.children) {
      rearrangedDeckCards.push(cardElement.card);
    }


    let f = [...rearrangedDeckCards].reverse();
    for (let i = 0; i < this.playerDeck.length; i++) {
      if (i > rearrangedDeckCards.length) {
        f.unshift(this.playerDeck[i]);
      }
    }
    // Update player deck with rearranged cards (top cards first)
    this.playerDeck = f;


    this.deckManipulationCards = []; // Clear temp cards
    if (this.deckManipulationResolve) {
      this.deckManipulationResolve(true); // Resolve deck manipulation promise
      this.deckManipulationResolve = null;
    }

    this.updateDeckCount();
    this.updateBattleLog("Your deck has been rearranged.");
  }


  async returnCardFromDiscardPileToHand(isOpponent) {
    if (isOpponent) {
      return this.opponentReturnCardFromDiscardPileToHand();
    } else {
      return this.playerReturnCardFromDiscardPileToHand();
    }
  }

  async playerReturnCardFromDiscardPileToHand() {
    const discardPile = this.playerDiscardPile;
    if (discardPile.length === 0) {
      this.updateBattleLog("Your discard pile is empty.");
      return false;
    }

    this.showDiscardPileModal(true); 

    return new Promise((resolve) => {
      const cardsContainer = document.getElementById('discard-pile-cards');
      cardsContainer.innerHTML = ''; 
      discardPile.forEach(card => {
        const cardElement = card.render();
        if (!card.hooks.includes("discard-pile")) {
          !card.hooks.push("discard-pile");
          cardElement.addEventListener('click', () => {
            if (card.discardPromise != null){
              this.playerHand.push(card); 
              const index = this.playerDiscardPile.indexOf(card);
              if (index > -1) {
                this.playerDiscardPile.splice(index, 1); 
              }
              this.renderHands();
              this.hideDiscardPileModal();
              this.updateBattleLog(`Returned ${card.type} from discard pile to hand.`);
              card.discardPromise(true); 
              card.discardPromise = null;
              for (let card2 of this.playerDiscardPile) {
                card2.discardPromise = null;
              }
              for (let card2 of this.opponentDiscardPile) {
                card2.discardPromise = null;
              }
            }
          });
        }

        card.discardPromise = resolve;
        cardsContainer.appendChild(cardElement);
      });
    });
  }

  async opponentReturnCardFromDiscardPileToHand() {
    const discardPile = this.opponentDiscardPile;
    if (discardPile.length === 0) {
      this.updateBattleLog("Opponent's discard pile is empty.");
      return false;
    }

    const cardToReturn = discardPile[Math.floor(Math.random() * discardPile.length)];
    this.opponentHand.push(cardToReturn);
    const index = this.opponentDiscardPile.indexOf(cardToReturn);
    if (index > -1) {
      this.opponentDiscardPile.splice(index, 1);
    }
    this.renderHands();

    const spellPopup = document.getElementById('spell-popup'); 
    spellPopup.innerHTML = `
      <h3>Opponent retrieved from discard</h3>
      <div>${cardToReturn.type}</div>
    `;
    spellPopup.classList.add('show');
    setTimeout(() => {
      spellPopup.classList.remove('show');
    }, 2000);
    this.updateBattleLog(`Opponent returned ${cardToReturn.type} from discard pile to hand.`);
    return true;
  }

  async handleCardClick(card, hand, field, handMode = true) {
    if (handMode) {
      if (this.waitingForDiscard && hand === this.playerHand) {
        this.waitingForDiscard = false;
        if (this.discardResolve) {
          const index = this.playerHand.indexOf(card);
          if (index > -1) {
            this.playerHand.splice(index, 1);
                this.discardCard(card, false); 
              this.renderHands();
              this.updateBattleLog(`Discarded ${card.type} for ability cost.`);
              this.discardResolve(true); 
            } else {
              this.updateBattleLog("Error discarding card.");
              this.discardResolve(false); 
            }
            this.discardResolve = null; 
        }
      } else if(this.discardPhaseActive && this.currentTurn === 'player'){
        this.selectCardToDiscard(card);
      } else if (this.canPlayCard) {
        await this.playCard(card, hand, field);
      }
    } else if (!handMode && !card.abilityUsedThisTurn && card.activatedAbility && this.canPlayCard) {
      await card.activateAbility();
      this.canPlayCard = true;
      card.abilityIsActive = false;
      this.renderHands();
    }
  }

  selectCardToDiscard(card) {
      if(this.discardPile.includes(card)) {
           const index = this.discardPile.indexOf(card);
          if (index > -1) {
              this.discardPile.splice(index, 1);
              this.discardedCardCount--;
          }
      } else {
          this.discardPile.push(card);
          this.discardedCardCount++;
      }
      const cardElement = card.render();
      if(this.discardPile.includes(card)) {
        card.toDiscard = true;
      } else {
        card.toDiscard = false;
      }
        this.renderHands();
  }
  playerDiscardCard() {
      return new Promise((resolve) => {
        this.waitingForDiscard = true;
        this.discardResolve = resolve;
        this.updateBattleLog("Click a card in your hand to discard for ability cost.");
        this.renderHands(); 
      });
    }

  updateBattleLog(message = '') {
    const battleLogElement = document.getElementById('battle-log');
    battleLogElement.innerHTML += `<p>${message}</p>`;
    battleLogElement.scrollTop = battleLogElement.scrollHeight;
  }

  playerDirectAttack() {
    if (this.selectedCard && this.opponentField.length === 0) {
      this.opponentLife -= this.selectedCard.power;
      this.selectedCard.hasAttacked = true;
      this.updateBattleLog(`Direct attack! Opponent takes ${this.selectedCard.power} damage.`);
      this.updateLifeDisplay();
      this.selectedCard = null;
      this.renderHands();
      this.checkGameOver();
    }
  }

  completeDiscard() {
      if(this.discardPhaseActive && this.currentTurn === 'player' && this.discardedCardCount === this.cardsToDiscard) {

          this.discardPile.forEach(card => {
            const index = this.playerHand.indexOf(card);
                if(index > -1) {
                    this.playerHand.splice(index, 1);
                    this.discardCard(card, false); 
                }
          });

          this.discardPile = [];
          this.discardedCardCount = 0;
          this.discardPhaseActive = false;
          this.discardButton.style.display = 'none';
          this.discardText.textContent="";
          this.renderHands();
          this.endTurn();
      }
  }

  async endTurnEffects() {
    if (this.currentTurn === 'player') {
      for (let card of this.getAllCardsOnField()) {
        card.manageStatusEffects();
      }
      this.canPlayCard = false;
      for (let card of this.playerField) {
        if(card.endOfTurnEffect) {
            for (let effect of card.endOfTurnEffect) {
                if(typeof effect.action === 'function'){
                    card.activeEffect=true;
                    this.renderHands();
                    await sleep(250);
                    await effect.action(this, false, await this.selectTargetForAbility(false, effect));
                      this.updateBattleLog(`Card End of Turn ability: ${effect.text}`);
                      await sleep(250);
                      card.activeEffect=false;
                    this.renderHands();

                  } else {
                    this.updateBattleLog("Error: endOfTurn effect has no action");
                  }
              }
          }
          card.hasAttacked = false;

      }
      this.canPlayCard = true;
    }
    // Discard down to 7 cards after end of turn effects
      const hand = this.currentTurn === 'player' ? this.playerHand : this.opponentHand;
      if(hand.length > 7) {
        this.cardsToDiscard = hand.length - 7;
        this.discardPhaseActive = true;

        if(this.currentTurn === 'player'){
            this.updateBattleLog(`Discard ${this.cardsToDiscard} cards.`);
        }

        this.renderHands();
          if(this.currentTurn === 'opponent') {
              this.opponentDiscard();
              this.renderHands();
              this.endTurn();

          }

          return;
      } else {
          this.endTurn();
      }
  }

  endTurn() {
    if (this.currentTurn === 'player') {
      this.currentTurn = 'opponent';
      this.showTurnChangePopup('Opponent Turn'); 
      const element = document.getElementById("opponent-area");
      element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      
      document.body.style.zoom = 1.0
      this.opponentTurn();
    }

    this.discardPhaseActive = false;
  }

  opponentDiscard() {
        const hand = this.opponentHand;
        while(hand.length > 7) {
            hand.shift();
        }
  }

  selectTargetForAbility(isOpponent = false, effect = null){
      return new Promise((resolve) => {
        if(effect && effect.requiresTarget && !isOpponent){

            const field = isOpponent ? (effect.positiveEffect ? this.opponentField : this.playerField) : (effect.positiveEffect ? this.playerField : this.opponentField);
            if(field.length > 0){

              if(field.length == 1) {
                resolve(field[0]);
              } else {
                this.isSelectingTarget = true;
                this.targetSelectionResolve = resolve;
                
                this.validTargets = [...field];
                console.log(this.validTargets);
                this.targetSelectionPopup.textContent = effect.text;
                this.targetSelectionPopup.classList.add('show');
                this.renderHands();
              }
            }
              else {
              resolve(null); 
            }
        } else if (effect && effect.requiresTarget && isOpponent) {
          const field = effect.positiveEffect ? this.opponentField : this.playerField;
          if (field.length > 0) {
            const target = field[Math.floor(Math.random() * field.length)];
            resolve(target);
          } else {
            resolve(null);
          }
        } else {
          resolve(null); 
        }
      });
  }


    async playCardOpponent(card) {
      if (card.isSpell) {
        await this.activateSpell(card, true);
          this.discardCard(card, true); 
        await sleep(3000);
      } else {

        if (card.isTribute && this.opponentField.length >= 2) {
          for (let i = 0; i < 2; i++) {
            const randomIndex = Math.floor(Math.random() * this.opponentField.length);
            const randomCard = this.opponentField[randomIndex];
            await randomCard.manageDeathEffects();
            randomCard.kill();
          }
        }

        this.opponentField.push(card);
        card.resetCard();
          if(card.continuousEffect){
            this.continuousEffects.push({ card: card, isOpponent: true });
          }
        this.renderHands();
        await sleep(1000);
        if(card.onPlayEffect){
          for (let effect of card.onPlayEffect) {
            if(typeof effect.action === 'function'){
              if (this.currentPhaseIndex == 1) {
                card.activeEffect=true;
                this.renderHands();
              }
              let target = await this.selectTargetForAbility(true, effect);
              if (this.currentPhaseIndex == 1) {
                if (target != null && effect.requiresTarget) {
                  target.isTarget = true;
                  this.renderHands();
                  await sleep(500);
                }
                await sleep(500);
              }
              this.updateBattleLog(`Opponent card played with ability: ${effect.text}`);
              await effect.action(this, true, target);
              
              if (this.currentPhaseIndex == 1) {
                if (target != null && effect.requiresTarget) {
                  target.isTarget = false;
                }
                card.activeEffect=false;
                this.renderHands();
                await sleep(500);
              }
              this.renderHands();
            } else {
              this.updateBattleLog("Error: opponent onPlay spell has no action.");
            }
          }
        }
      }
  }

  async drawThenDiscard(amount, isOpponent) {
    await this.drawCard(amount, isOpponent);
    await sleep(500);
    await this.discardSelfCard(isOpponent);
  }

  opponentTurn() {
    setTimeout(async () => {
      this.showTurnChangePopup('Opponent Turn'); // Show popup for opponent turn
      this.cardPlayedThisTurn = false;


      this.drawCard(1, true)

      this.currentPhaseIndex = 0;
      this.updatePhaseDisplay();

      await sleep(1000);
      this.currentPhaseIndex = 1;
      this.updatePhaseDisplay();
      let canPlay =true;
      while (canPlay) {
        if (this.opponentHand.length > 0 && this.opponentField.length < 5 && !this.gameOver) {
          // Prioritize playing the highest power card if possible
          let bestCardIndex = -1;
          let bestCardPower = -1;

          for(let i = 0; i < this.opponentHand.length; i++) {
            const card = this.opponentHand[i];
            if ((!card.isTribute || this.opponentField.length>=2) && !card.isSpell && card.power > bestCardPower) {
              bestCardPower = card.power;
              bestCardIndex = i;
            }
          }

          // Play the highest power card if found, otherwise play the first card
          const card = this.opponentHand.splice(bestCardIndex === -1 ? 0 : bestCardIndex, 1)[0];
          if (!card.goAgain) {
            canPlay =false;
          }
          await this.playCardOpponent(card)
        } else {
          canPlay = false; // No more cards to play or field full
        }
      }

      // Opponent uses activated abilities during play phase
      for (let card of this.opponentField) {
        if (card.activatedAbility && !card.abilityUsedThisTurn && !this.gameOver) {
          if (card.activatedAbility.cost != null && !['life', null].includes(card.activatedAbility.cost)) {
             continue; // Skip abilities with costs other than life or null for now
          }
          if (card.statusEffects.includes("stun")) {
            continue;
          }
          if (card.activatedAbility.cost === 'life') {
            if (this.opponentLife > card.activatedAbility.value) {
              this.opponentLife -= card.activatedAbility.value
              this.updateLifeDisplay();
              this.updateBattleLog(`Opponent's ${card.type} activated ability: ${card.activatedAbility.text} (Cost: Pay Life)`);
              await card.activatedAbility.action(this, true, await this.selectTargetForAbility(true, card.activatedAbility));
              card.abilityUsedThisTurn = true;
              this.updateLifeDisplay();
              await sleep(500);
            }
          } else if (card.activatedAbility.cost === 'discard') {
            if (this.opponentHand.length > 1) { // Ensure opponent has cards to discard, keep at least one card
              const cardToDiscardIndex = 0; // Always discard the first card for simplicity for now
              const discardedCard = this.opponentHand.splice(cardToDiscardIndex, 1)[0];
              this.discardCard(discardedCard, true);
              this.updateBattleLog(`Opponent discarded ${discardedCard.type} to activate ${card.type}'s ability.`);
              this.updateBattleLog(`Opponent's ${card.type} activated ability: ${card.activatedAbility.text} (Cost: Discard)`);
              await card.activatedAbility.action(this, true, await this.selectTargetForAbility(true, card.activatedAbility));
              card.abilityUsedThisTurn = true;
              this.renderHands();
              await sleep(500);

            }
          } else if (card.activatedAbility.cost === 'sacrifice') {
            this.updateBattleLog(`Opponent's ${card.type} activated ability: ${card.activatedAbility.text} (Cost: Sacrifice)`);
            await card.activatedAbility.action(this, true, await this.selectTargetForAbility(true, card.activatedAbility));
              card.abilityUsedThisTurn = true;
              card.isDead = true;
              await card.manageDeathEffects();
              card.kill();
              await sleep(500);
              
              
              this.renderHands();
          } else { // No cost ability
            this.updateBattleLog(`Opponent's ${card.type} activated ability: ${card.activatedAbility.text} (No Cost)`);
            await card.activatedAbility.action(this, true, await this.selectTargetForAbility(true, card.activatedAbility));
            card.abilityUsedThisTurn = true;

            await sleep(500);
          }
          this.renderHands();
        }
        this.checkGameOver();
        if (this.gameOver) {return;}
      }
      if (this.gameOver) {return;}

        this.currentPhaseIndex = 2;
      this.updatePhaseDisplay();

      // All opponent cards attack if possible
      for(let card of this.opponentField) {
        if (this.gameOver) {return;}
        if (card.statusEffects.includes("stun")) {continue;}
        // Prioritize attacking the highest power target, then highest defense if powers are equal
        let targetCard = null;
        let bestTargetValue = -999; // Initialize with a very low value

        for (const playerCard of this.playerField) {
          let cardValue = playerCard.power * 0.6 + playerCard.defense * 0.4; // Weight power slightly higher
          if (cardValue > bestTargetValue) {
            bestTargetValue = cardValue;
            targetCard = playerCard;
          }
        }


        if (this.playerField.length > 0 && !card.keywords.includes("evasive")) {
          if (!targetCard) {
            targetCard = this.playerField[0]; // Fallback in case logic fails
          }
          const attackerElement = card.render();
          const targetElement = targetCard.render();

          const attackerPosition = attackerElement.getBoundingClientRect();
          const targetPosition = targetElement.getBoundingClientRect();
          card.hasAttacked = true;
          await card.attack(targetCard, attackerElement, attackerPosition, targetPosition);

          // Remove destroyed cards
          if (targetCard.isDead) {
            const index = this.playerField.indexOf(targetCard);
            if (index > -1) {
              this.playerField.splice(index, 1);
              this.updateBattleLog(`Opponent's ${card.type} destroyed a player card!`);
            }
          }
          await sleep(500);
          this.renderHands();
          await sleep(500);
        } else {
          this.playerLife -= card.power;
          this.updateBattleLog(`Opponent deals ${card.power} direct damage!`);

          if (card.keywords.includes("leeching")) {
            this.gainLife(card.power,true);
          }

          this.updateLifeDisplay();

          this.createAttackLine(card.render().getBoundingClientRect(), document.getElementById('player-life').getBoundingClientRect());
          card.hasAttacked = true;
          let attackerElement = card.render();
          attackerElement.classList.add('attacking-animation');
          attackerElement.addEventListener('animationend', () => {
              attackerElement.classList.remove('attacking-animation');
          }, { once: true });
          await sleep(1000);

          await card.manageCombatDamageEffects();
        }
      }
      this.checkGameOver();
      if (this.gameOver) {return;}
      this.currentPhaseIndex = 3;
      this.opponentField.forEach(card => card.abilityUsedThisTurn = false);
      this.updatePhaseDisplay();
      for (let card of this.getAllCardsOnField()) {
        await card.manageStatusEffects();
      }
      for (let card of this.opponentField) {
        if(card.endOfTurnEffect) {
          for (let effect of card.endOfTurnEffect) {
            if(typeof effect.action === 'function') {
              card.activeEffect=true;
              this.renderHands();
              let target = await this.selectTargetForAbility(true, effect);
              if (target != null && effect.requiresTarget) {
                target.isTarget = true;
                this.renderHands();
                await sleep(500);
              }
              await sleep(500);
              await effect.action(this, true, target);
              this.updateBattleLog(`Opponent card End of Turn ability: ${effect.text}`);
              if (target != null && effect.requiresTarget) {
                target.isTarget = false;
              }
              card.activeEffect=false;
              this.renderHands();
              await sleep(500);
            } else {
              this.updateBattleLog("Error: opponent endOfTurn effect has no action");
            }
          }
        }
      }

      for (let card of this.opponentField) {
        card.hasAttacked = false;
      }

      while(this.opponentHand.length > 7) {
        let c = this.opponentHand.splice(Math.floor(Math.random() * this.opponentHand.length),1)[0];
        this.discardCard(c, true);
      }
      if (this.gameOver) {return;}
      this.renderHands();
      this.currentTurn = 'player';
      this.currentPhaseIndex = 0;
      this.updatePhaseDisplay();
      this.updateLifeDisplay();
      this.showTurnChangePopup('Your Turn'); // Show popup for player turn
      const element = document.getElementById("player-area");
      element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      document.body.style.zoom = 1.0;
  }, 100);
  }

  createAttackLine(attackerPosition, targetPosition) {
       const gameContainer = document.getElementById('game-container');
        const line = document.createElement('div');
        line.classList.add('attack-line');

        const startX = attackerPosition.left + attackerPosition.width / 2 + gameContainer.scrollLeft;
        const startY = attackerPosition.top + attackerPosition.height / 2 + gameContainer.scrollTop;
        const endX = targetPosition.left + targetPosition.width / 2 + gameContainer.scrollLeft;
        const endY = targetPosition.top + targetPosition.height / 2 + gameContainer.scrollTop;

        const length = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

        line.style.width = `${length}px`;

        let midX = startX/2 + endX / 2;
        let midY = startY/2 + endY / 2;
        let bbox = gameContainer.getBoundingClientRect();
        let f = bbox.top < 0 ? bbox.top : 0;
        line.style.left = `${midX-length/2}px`;
        line.style.top = `${midY - f}px`;
        line.style.transform = `rotate(${angle}deg)`;

        gameContainer.appendChild(line);

      setTimeout(() => {
        line.remove();
      }, 1000);
  }

  async selectCardForAttack(card) {
    if (this.currentTurn !== 'player' ||
        this.phases[this.currentPhaseIndex] !== 'attack' ||
        card.hasAttacked || !this.canDeclareAttack) return;
      this.canDeclareAttack = false;
    // Direct attack when opponent has no cards
    if (this.opponentField.length === 0 || card.keywords.includes("evasive")) {
      this.opponentLife -= card.power;
      card.hasAttacked = true;
      this.updateBattleLog(`Direct attack! Opponent takes ${card.power} damage.`);
      this.updateLifeDisplay();
      this.checkGameOver();
      this.renderHands();
      this.createAttackLine(card.render().getBoundingClientRect(), document.getElementById('opponent-life').getBoundingClientRect());
      let attackerElement = card.render();
      if (attackerElement) {
          attackerElement.classList.add('attacking-animation');

          attackerElement.addEventListener('animationend', () => {
            attackerElement.classList.remove('attacking-animation');

        }, { once: true });
    }
      if (card.keywords.includes("leeching")) {
        this.gainLife(card.power, this.currentTurn === 'opponent');
        this.updateBattleLog(`${card.type} leeching heals for ${card.power} life!`);
      }

      if (card.combatDamageEffects) {
        await sleep(500);
        await card.manageCombatDamageEffects();
      }
      this.canDeclareAttack = true;
    }

    // Remove previous selection styling
    if (this.selectedCard) {
      const previousCardElement = this.selectedCard.render();
    }

    this.selectedCard = card;
    this.canDeclareAttack = true;
    const cardElement = card.render();
  }

  async attackOpponentCard(targetCard) {
    if (this.currentTurn !== 'player' ||
        this.phases[this.currentPhaseIndex] !== 'attack' ||
        !this.selectedCard || !this.canDeclareAttack) return;


    this.canDeclareAttack = false;
    const attackerElement = this.selectedCard.render();


      if (this.selectedCard.keywords.includes("evasive")) {return;}

    const attackerPosition = attackerElement.getBoundingClientRect();
    let targetPosition = null;

    if (this.opponentField.includes(targetCard)) {
          const targetElement = targetCard.render();
           targetPosition = targetElement.getBoundingClientRect();
    }

    // Normal card attack logic
    if (this.opponentField.includes(targetCard)) {

      this.selectedCard.hasAttacked = true;
        const destroyed = await this.selectedCard.attack(targetCard, attackerElement, attackerPosition, targetPosition);

      // Remove card if destroyed
      if (destroyed) {
        const index = this.opponentField.indexOf(targetCard);
        if (index > -1) {
          this.opponentField.splice(index, 1);
          this.updateBattleLog(`${this.selectedCard.type} destroyed ${targetCard.type}!`);
        }
      }
    }

    this.canDeclareAttack = true;

    this.selectedCard = null;
    this.renderHands();
    this.checkGameOver();
  }

  showTurnChangePopup(turn) {
    if (this.turnChangePopup) {
      this.turnChangePopup.textContent = turn;
      this.turnChangePopup.classList.add('show');
      setTimeout(() => {
        this.turnChangePopup.classList.remove('show');
      }, 2000); 
    }
  }

  async discardSelfCard(isOpponent) {
    if (isOpponent) {
      const randomIndex = Math.floor(Math.random() * this.opponentHand.length);
      const discardedCard = this.opponentHand.splice(randomIndex, 1)[0];
      this.discardCard(discardedCard, true);
      this.updateBattleLog(`Opponent discards their ${discardedCard.type}.`);
      this.renderHands();
    } else {
      const revealPopup = document.getElementById('reveal-popup');
      const revealCardContainer = document.getElementById('reveal-card');
      revealCardContainer.innerHTML = '';
      revealCardContainer.style.display = 'grid';
      revealCardContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(120px, 1fr))';
      revealCardContainer.style.minHeight = '400px';
      revealCardContainer.style.maxHeight = '400px';
      revealCardContainer.style.overflowY = 'auto';
      revealCardContainer.style.width = 'auto';


      this.playerHand.forEach(card => {
        const cardElement = card.render();
        cardElement.addEventListener('click', () => {
          const index = this.playerHand.indexOf(card);
          if (index > -1) {
            this.playerHand.splice(index, 1);
            this.discardCard(card, false); 
            this.updateBattleLog(`You discarded ${card.type}.`);
            revealPopup.style.display = 'none';
            revealCardContainer.innerHTML = '';
          }
        });
        revealCardContainer.appendChild(cardElement);
      });

      revealPopup.style.display = 'flex';
      return new Promise((resolve) => {
        const closeHandler = () => {
          revealCardContainer.style.display = '';
          revealCardContainer.style.minHeight = '';
          revealCardContainer.style.maxHeight = '';
          revealCardContainer.style.overflowY = '';
          revealCardContainer.style.width = '';

          revealPopup.style.display = 'none';
          revealCardContainer.innerHTML = '';
          resolve(false); 
          revealPopup.removeEventListener('click', closeHandler);
        };
        revealPopup.addEventListener('click', closeHandler);
      });
    }
  }

  conjureCard(amount, isOpponent) {
    return new Promise((resolve) => {
      let newCards = [];
      for (let i = 0; i < amount; i++) {
        let c = new Card();
        c.generateRandomCard('upgrade');
        c.game = this;
        newCards.push(c);
      }

      if (!isOpponent) {
        const revealPopup = document.getElementById('reveal-popup');
        const revealCardContainer = document.getElementById('reveal-card');
        revealCardContainer.innerHTML = '';
        revealCardContainer.style.display = 'grid';
        revealCardContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(120px, 1fr))';
        revealCardContainer.style.minHeight = '400px';
        revealCardContainer.style.maxHeight = '400px';
        revealCardContainer.style.overflowY = 'auto';
        revealCardContainer.style.width = 'auto';


        newCards.forEach(card => {
          const cardElement = card.render();
          cardElement.addEventListener('click', () => {
            this.playerHand.push(card);
            this.updateBattleLog(`You conjured ${card.type}.`);
            revealPopup.style.display = 'none';
            revealCardContainer.innerHTML = '';
            this.renderHands();
          });
          revealCardContainer.appendChild(cardElement);
        });

        revealPopup.style.display = 'flex';
        
        const closeHandler = () => {
          revealCardContainer.style.display = '';
          revealCardContainer.style.minHeight = '';
          revealCardContainer.style.maxHeight = '';
          revealCardContainer.style.overflowY = '';
          revealCardContainer.style.width = '';

          revealPopup.style.display = 'none';
          revealCardContainer.innerHTML = '';
          
          revealPopup.removeEventListener('click', closeHandler);
          console.log("Triggering");
          resolve(false); 
        };
        revealPopup.addEventListener('click', closeHandler);
        
      } else {
        let highRarity = 0;
        let rarities = ["Common", "Rare", "Epic", "Legendary", "Holy"];
        for (let i = 0; i < newCards.length; i++) {
          let card = newCards[i];
          if (rarities.indexOf(card.rarity) > highRarity) {
            highRarity = i;
          }
        }
        this.opponentHand.push(newCards[highRarity]);
        this.updateBattleLog(`Opponent conjures ${newCards[highRarity].type}.`);
        this.renderHands();
        resolve(true);
      }
    });
  }

  async lookAtOpponentHandAndDiscard(isOpponent) {
    if (!isOpponent) {
      const revealPopup = document.getElementById('reveal-popup');
      const revealCardContainer = document.getElementById('reveal-card');
      revealCardContainer.innerHTML = '';
      revealCardContainer.style.display = 'grid';
      revealCardContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(120px, 1fr))';
      revealCardContainer.style.minHeight = '400px';
      revealCardContainer.style.maxHeight = '400px';
      revealCardContainer.style.overflowY = 'auto';
      revealCardContainer.style.width = 'auto';


      this.opponentHand.forEach(card => {
        const cardElement = card.render();
        cardElement.addEventListener('click', () => {
          const index = this.opponentHand.indexOf(card);
          if (index > -1) {
            this.opponentHand.splice(index, 1);
            this.discardCard(card, true); 
            this.updateBattleLog(`You forced opponent to discard ${card.type}.`);
            revealPopup.style.display = 'none';
            revealCardContainer.innerHTML = '';
          }
        });
        revealCardContainer.appendChild(cardElement);
      });

      revealPopup.style.display = 'flex';
      return new Promise((resolve) => {
        const closeHandler = () => {
          revealCardContainer.style.display = '';
          revealCardContainer.style.minHeight = '';
          revealCardContainer.style.maxHeight = '';
          revealCardContainer.style.overflowY = '';
          revealCardContainer.style.width = '';

          revealPopup.style.display = 'none';
          revealCardContainer.innerHTML = '';
          resolve(false); 
          revealPopup.removeEventListener('click', closeHandler);
        };
        revealPopup.addEventListener('click', closeHandler);
      });
    } else {
      const randomIndex = Math.floor(Math.random() * this.playerHand.length);
      const discardedCard = this.playerHand.splice(randomIndex, 1)[0];
      this.discardCard(discardedCard, false);
      this.updateBattleLog(`Opponent discards your ${discardedCard.type}.`);

      const revealPopup = document.getElementById('reveal-popup'); 
      const revealCardContainer = document.getElementById('reveal-card');
      revealCardContainer.innerHTML = '';
      const cardElement = discardedCard.render();
      cardElement.style.width = "240px";
      cardElement.style.height = "340px";
      cardElement.style.margin = "0";
      revealCardContainer.appendChild(cardElement);
      revealPopup.style.display = 'flex';

      await sleep(2000);
        revealPopup.style.display = 'none';
        revealCardContainer.innerHTML = '';
        cardElement.style.width = "";
        cardElement.style.height="";
        cardElement.style.margin = "";

      return true;
    }
  }

  async selectCardForSacrifice(card) {
    if (!this.sacrificeInProgress) {
      return;
    }

    if (!this.sacrificesSelected.includes(card)) {
      this.sacrificesSelected.push(card);
      card.renderElement.classList.add('selected', 'discard-selected'); 
    } else {
      const index = this.sacrificesSelected.indexOf(card);
      if (index > -1) {
        this.sacrificesSelected.splice(index, 1);
        card.renderElement.classList.remove('selected', 'discard-selected');
      }
    }

    if (this.sacrificesSelected.length === 2) {
      await this.executeTributePlay();
    }
  }

  async executeTributePlay() {
    if (!this.sacrificeInProgress || this.sacrificesSelected.length !== 2 || !this.tributeCardToPlay) {
      return;
    }

    const card = this.tributeCardToPlay;
    const sacrifices = [...this.sacrificesSelected]; 

    this.sacrificeInProgress = false;
    this.tributeCardToPlay = null;
    this.sacrificesSelected = [];

    for (const sacrificeCard of sacrifices) {
      await sacrificeCard.manageDeathEffects();
      sacrificeCard.kill();
    }

    this.playerField.push(card);
    this.updateBattleLog(`${card.type} summoned by sacrificing two creatures!`);
    this.renderHands();
    if(card.onPlayEffect){
        for (let effect of card.onPlayEffect) {
            if(typeof effect.action === 'function'){
                card.activeEffect = true;
                this.renderHands();

                await sleep(250);
                this.updateBattleLog(`Card played with ability: ${effect.text}`);
                await effect.action(this, false, await this.selectTargetForAbility(false, effect));
                card.activeEffect = false;
                this.renderHands();
                await sleep(250);
            } else {
                this.updateBattleLog("Error: onPlay spell has no action.");
            }
        }
    }
    this.renderHands();
    
    if (!card.goAgain) {
      this.cardPlayedThisTurn = true;
    }
    this.canPlayCard = true;
    this.updateNextPhaseButton();
  }
}

new Game();