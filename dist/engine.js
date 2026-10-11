export const STORIES = [
  { title: 'The door in the woods', text: 'the door at the end of the path had not been there yesterday. you knew these woods. you knew every tree, every stone, every turn. but here was a little orange door, standing alone in the morning mist. you reached for the handle. somewhere on the other side, someone was waiting.' },
  { title: 'A pocket full of stars', text: 'the first star fell into your pocket on a quiet night. it was warm, like a pebble left in the sun. by morning, three more had joined it. you carried them to the highest hill and opened your hands. the sky leaned closer. for a moment, even the moon held its breath.' },
  { title: 'The last train home', text: 'a little train waited at a station that no map could find. its windows glowed gold against the rain. the conductor tipped his hat and asked where you wanted to go. home, you said. he smiled. everyone says that. the wheels began to turn, and the city slowly became a forest.' },
  { title: 'Something beyond the sea', text: 'the boat was small, but the sea was kind. you followed a paper map past islands shaped like sleeping giants. at sunset, a whale surfaced beside you. it carried a garden on its back. tiny lanterns hung from the trees. you tied your boat to a root and stepped into the light.' },
  { title: 'The rooftop garden', text: 'above the noisy city, a garden grew in secret. you found it by following a yellow bird up seven flights of stairs. the tomatoes were blue. the flowers whispered your name. an old woman handed you a watering can and pointed to an empty pot. every good story, she said, begins with a little care.' },
  { title: 'A very small dragon', text: 'the dragon in your kitchen was no bigger than a cup. it sneezed sparks into the sugar and curled up beside the kettle. you gave it a name and half a piece of toast. outside, the world was cold and gray. inside, something small and wonderful was learning how to fly.' },
  { title: 'The moving mountain', text: 'one morning, the mountain took a step. cups rattled. birds scattered. the whole village watched as it slowly turned toward the sunrise. you packed a lunch and ran after it. when you finally caught up, a voice rumbled from deep within the stone. would you like to see what lies beyond the clouds?' },
  { title: 'A letter to tomorrow', text: 'you wrote a letter to tomorrow and left it beneath a stone. you asked for rain, for courage, for one more chance. the next day, a letter waited in its place. the paper smelled of grass. the handwriting looked familiar. just keep going, it said. you are closer than you think.' }
];
const COMMON = {the:['teh','hte','th'],and:['adn','nad'],you:['yuo','oyu'],your:['yuor'],was:['wsa'],with:['wiht'],that:['taht'],there:['thier','ther'],their:['thier'],from:['form'],friend:['freind'],because:['becuase'],little:['littel'],quiet:['qu iet'],every:['evrey'],through:['throught'],would:['woudl'],could:['coudl'],should:['shoudl'],of:['fo'],to:['ot']};
export function classifyWord(typed, expected) {
  const a=typed.toLowerCase(), b=expected.toLowerCase();
  if(a===b) return 'correct';
  // Keep punctuation meaningful. A spelling exception must preserve punctuation.
  const punctuation=/[^a-z0-9]/g;
  if(a.replace(/[a-z0-9]/g,'')!==b.replace(/[a-z0-9]/g,'')) return 'fall';
  const aw=a.replace(punctuation,''), bw=b.replace(punctuation,'');
  if(COMMON[bw]?.includes(aw)) return 'stumble';
  if(aw.length===bw.length && aw.length>1){
    for(let i=0;i<aw.length-1;i++){
      if(aw.slice(0,i)+aw[i+1]+aw[i]+aw.slice(i+2)===bw) return 'stumble';
    }
  }
  return 'fall';
}
export function matchingPrefix(typed, expected) {
  let i=0;while(i<typed.length && i<expected.length && typed[i].toLowerCase()===expected[i].toLowerCase())i++;return i;
}
export function layoutWords(text, measure, gap=19) {
  let x=0;return text.split(' ').map(word=>{const item={word,x,width:measure(word)};x+=item.width+gap;return item;});
}
