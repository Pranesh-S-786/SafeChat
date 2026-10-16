import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Clock, Smile, Hand, Heart, Coffee, Car, Trophy, Lightbulb, Flag, X } from 'lucide-react';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  emojis: { emoji: string; keywords: string }[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    name: 'Smileys & Emotion',
    icon: <Smile className="h-4 w-4" />,
    emojis: [
      { emoji: '😀', keywords: 'grinning face happy smile' },
      { emoji: '😃', keywords: 'smiley smiling joy happy' },
      { emoji: '😄', keywords: 'smile smiling eyes laugh happy' },
      { emoji: '😁', keywords: 'beaming grin teeth smile' },
      { emoji: '😆', keywords: 'laughing closed eyes funny lol haha' },
      { emoji: '😅', keywords: 'sweat smile relief nervous' },
      { emoji: '🤣', keywords: 'rofl rolling floor laughing funny lol haha' },
      { emoji: '😂', keywords: 'joy tears laugh lol haha' },
      { emoji: '🙂', keywords: 'slightly smiling' },
      { emoji: '🙃', keywords: 'upside down silly' },
      { emoji: '😉', keywords: 'wink playful joke' },
      { emoji: '😊', keywords: 'blush smiling warm happy' },
      { emoji: '😇', keywords: 'angel innocent halo' },
      { emoji: '🥰', keywords: 'love heart face adore' },
      { emoji: '😍', keywords: 'heart eyes love crush' },
      { emoji: '🤩', keywords: 'star struck excited' },
      { emoji: '😘', keywords: 'kiss heart blow' },
      { emoji: '😗', keywords: 'kissing' },
      { emoji: '😚', keywords: 'kissing closed eyes' },
      { emoji: '😙', keywords: 'kissing smiling' },
      { emoji: '😋', keywords: 'yum delicious food taste' },
      { emoji: '😛', keywords: 'tongue silly' },
      { emoji: '😜', keywords: 'wink tongue joke' },
      { emoji: '🤪', keywords: 'zany wild crazy' },
      { emoji: '😝', keywords: 'tongue squint squinting' },
      { emoji: '🤑', keywords: 'money rich dollar cash' },
      { emoji: '🤗', keywords: 'hug hugging warm' },
      { emoji: '🤭', keywords: 'hand over mouth oops' },
      { emoji: '🤫', keywords: 'shh quiet secret' },
      { emoji: '🤔', keywords: 'thinking ponder hmm wonder' },
      { emoji: '🤐', keywords: 'zipper quiet sealed' },
      { emoji: '🤨', keywords: 'raised eyebrow suspect doubt' },
      { emoji: '😐', keywords: 'neutral blank meh' },
      { emoji: '😑', keywords: 'expressionless poker face' },
      { emoji: '😶', keywords: 'no mouth silent' },
      { emoji: '😏', keywords: 'smirk flirt sassy' },
      { emoji: '😒', keywords: 'unamused displeased annoyed' },
      { emoji: '🙄', keywords: 'rolling eyes sarcasm annoyed' },
      { emoji: '😬', keywords: 'grimace awkward cringe' },
      { emoji: '🤥', keywords: 'lying pinocchio' },
      { emoji: '😌', keywords: 'relieved peaceful zen' },
      { emoji: '😔', keywords: 'pensive sad sorrow' },
      { emoji: '😪', keywords: 'sleepy tired snot' },
      { emoji: '🤤', keywords: 'drooling craving' },
      { emoji: '😴', keywords: 'sleeping zzz tired' },
      { emoji: '😷', keywords: 'mask sick health doctor' },
      { emoji: '🤒', keywords: 'thermometer sick ill fever' },
      { emoji: '🤕', keywords: 'bandage hurt injury' },
      { emoji: '🤢', keywords: 'nauseated sick gross' },
      { emoji: '🤮', keywords: 'vomiting barf gross' },
      { emoji: '🤧', keywords: 'sneezing cold tissue' },
      { emoji: '🥵', keywords: 'hot heat summer sweating' },
      { emoji: '🥶', keywords: 'cold freezing winter ice' },
      { emoji: '🥴', keywords: 'woozy dizzy intoxicated' },
      { emoji: '😵', keywords: 'dizzy dead knocked out' },
      { emoji: '🤯', keywords: 'exploding head mind blown shock' },
      { emoji: '🤠', keywords: 'cowboy hat yeehaw' },
      { emoji: '🥳', keywords: 'partying celebrate horn hat' },
      { emoji: '😎', keywords: 'sunglasses cool awesome' },
      { emoji: '🤓', keywords: 'nerd geek glasses smart' },
      { emoji: '🧐', keywords: 'monocle classy inspect' },
      { emoji: '😕', keywords: 'confused lost' },
      { emoji: '😟', keywords: 'worried concern' },
      { emoji: '🙁', keywords: 'frowning sad' },
      { emoji: '😮', keywords: 'open mouth wow surprise' },
      { emoji: '😯', keywords: 'hushed shock' },
      { emoji: '😲', keywords: 'astonished amazed' },
      { emoji: '😳', keywords: 'flushed embarrassed blush' },
      { emoji: '🥺', keywords: 'pleading puppy eyes please' },
      { emoji: '😦', keywords: 'frowning open mouth' },
      { emoji: '😧', keywords: 'anguished pain' },
      { emoji: '😨', keywords: 'fearful scared fright' },
      { emoji: '😰', keywords: 'anxious sweat nervous' },
      { emoji: '😥', keywords: 'sad relieved disappointed' },
      { emoji: '😢', keywords: 'crying tear sad' },
      { emoji: '😭', keywords: 'loudly crying sobbing tears' },
      { emoji: '😱', keywords: 'screaming scream terror scream' },
      { emoji: '😖', keywords: 'confounded frustration' },
      { emoji: '😣', keywords: 'persevering struggle' },
      { emoji: '😞', keywords: 'disappointed sad' },
      { emoji: '😓', keywords: 'downcast sweat' },
      { emoji: '😩', keywords: 'weary tired exhausted' },
      { emoji: '😫', keywords: 'tired fed up' },
      { emoji: '🥱', keywords: 'yawning sleepy bored' },
      { emoji: '😤', keywords: 'triumph huff angry' },
      { emoji: '😡', keywords: 'pouting rage angry mad' },
      { emoji: '😠', keywords: 'angry mad grumpy' },
      { emoji: '🤬', keywords: 'cursing swearing mad anger' },
      { emoji: '😈', keywords: 'devil horns evil smile' },
      { emoji: '👿', keywords: 'angry devil demon' },
      { emoji: '💀', keywords: 'skull dead skeleton' },
      { emoji: '☠️', keywords: 'skull crossbones danger' },
      { emoji: '💩', keywords: 'poop smiling pile' },
      { emoji: '🤡', keywords: 'clown circus foolish' },
      { emoji: '👻', keywords: 'ghost spooky halloween' },
      { emoji: '👽', keywords: 'alien ufo extraterrestrial' },
      { emoji: '🤖', keywords: 'robot android bot' },
    ],
  },
  {
    id: 'people',
    name: 'People & Body',
    icon: <Hand className="h-4 w-4" />,
    emojis: [
      { emoji: '👋', keywords: 'wave waving hand hello goodbye' },
      { emoji: '🤚', keywords: 'raised back hand' },
      { emoji: '🖐️', keywords: 'fingers splayed five' },
      { emoji: '✋', keywords: 'raised hand stop high five' },
      { emoji: '🖖', keywords: 'vulcan spock star trek' },
      { emoji: '👌', keywords: 'ok sign perfect good' },
      { emoji: '🤌', keywords: 'pinched fingers italian what' },
      { emoji: '🤏', keywords: 'pinching small little' },
      { emoji: '✌️', keywords: 'peace victory two' },
      { emoji: '🤞', keywords: 'fingers crossed luck hope' },
      { emoji: '🤟', keywords: 'love you gesture ily' },
      { emoji: '🤘', keywords: 'rock on metal horns' },
      { emoji: '🤙', keywords: 'call me hang loose shaka' },
      { emoji: '👈', keywords: 'point left finger' },
      { emoji: '👉', keywords: 'point right finger' },
      { emoji: '👆', keywords: 'point up finger' },
      { emoji: '👇', keywords: 'point down finger' },
      { emoji: '☝️', keywords: 'index pointing up one' },
      { emoji: '👍', keywords: 'thumbs up like approve yes' },
      { emoji: '👎', keywords: 'thumbs down dislike bad no' },
      { emoji: '✊', keywords: 'fist power strength' },
      { emoji: '👊', keywords: 'punch fist bump attack' },
      { emoji: '🤛', keywords: 'left fist bump' },
      { emoji: '🤜', keywords: 'right fist bump' },
      { emoji: '👏', keywords: 'clapping hands applause bravo' },
      { emoji: '🙌', keywords: 'raising hands celebrate praise' },
      { emoji: '👐', keywords: 'open hands' },
      { emoji: '🤲', keywords: 'palms together praying' },
      { emoji: '🤝', keywords: 'handshake deal agree meet' },
      { emoji: '🙏', keywords: 'folded hands pray thank please namaste' },
      { emoji: '✍️', keywords: 'writing hand pen signature' },
      { emoji: '💅', keywords: 'nail polish sassy manicure' },
      { emoji: '🤳', keywords: 'selfie phone camera photo' },
      { emoji: '💪', keywords: 'flexed biceps muscle strong gym flex' },
      { emoji: '🧠', keywords: 'brain mind smart intellect' },
      { emoji: '👀', keywords: 'eyes look see curious peep' },
      { emoji: '👁️', keywords: 'eye watch vision see' },
      { emoji: '👅', keywords: 'tongue lick taste' },
      { emoji: '👄', keywords: 'mouth lips kiss speak' },
      { emoji: '👶', keywords: 'baby infant child' },
      { emoji: '🧒', keywords: 'child kid youth' },
      { emoji: '👦', keywords: 'boy male kid' },
      { emoji: '👧', keywords: 'girl female kid' },
      { emoji: '🧑', keywords: 'person adult human' },
      { emoji: '👨', keywords: 'man male adult' },
      { emoji: '👩', keywords: 'woman female adult' },
      { emoji: '👱', keywords: 'blond person hair' },
      { emoji: '👴', keywords: 'old man grandfather senior' },
      { emoji: '👵', keywords: 'old woman grandmother senior' },
      { emoji: '👮', keywords: 'police officer cop law' },
      { emoji: '🕵️', keywords: 'detective spy investigator' },
      { emoji: '💂', keywords: 'guard soldier royal' },
      { emoji: '👷', keywords: 'construction worker helmet hardhat' },
      { emoji: '🤴', keywords: 'prince royal crown' },
      { emoji: '👸', keywords: 'princess royal crown tiara' },
      { emoji: '🦸', keywords: 'superhero hero brave' },
      { emoji: '🦹', keywords: 'supervillain villain evil' },
      { emoji: '🧙', keywords: 'mage wizard magic' },
      { emoji: '🧚', keywords: 'fairy fantasy wings' },
      { emoji: '🧛', keywords: 'vampire dracula blood' },
      { emoji: '🧟', keywords: 'zombie undead brain' },
      { emoji: '🚶', keywords: 'person walking pedestrian' },
      { emoji: '🏃', keywords: 'person running runner athlete' },
      { emoji: '💃', keywords: 'woman dancing tango party' },
      { emoji: '🕺', keywords: 'man dancing disco club' },
    ],
  },
  {
    id: 'animals',
    name: 'Animals & Nature',
    icon: <Coffee className="h-4 w-4" />,
    emojis: [
      { emoji: '🐶', keywords: 'dog puppy pet canine' },
      { emoji: '🐱', keywords: 'cat kitten pet feline meow' },
      { emoji: '🐭', keywords: 'mouse rodent squeak' },
      { emoji: '🐹', keywords: 'hamster rodent pet' },
      { emoji: '🐰', keywords: 'rabbit bunny pet easter' },
      { emoji: '🦊', keywords: 'fox wild red' },
      { emoji: '🐻', keywords: 'bear wild nature' },
      { emoji: '🐼', keywords: 'panda bear bamboo cute' },
      { emoji: '🐨', keywords: 'koala australia eucalyptus' },
      { emoji: '🐯', keywords: 'tiger cat wild predator' },
      { emoji: '🦁', keywords: 'lion king predator jungle' },
      { emoji: '🐮', keywords: 'cow moo farm cattle' },
      { emoji: '🐷', keywords: 'pig farm pork oink' },
      { emoji: '🐸', keywords: 'frog toad ribbit amphibian' },
      { emoji: '🐵', keywords: 'monkey face animal banana' },
      { emoji: '🙈', keywords: 'see no evil monkey eyes' },
      { emoji: '🙉', keywords: 'hear no evil monkey ears' },
      { emoji: '🙊', keywords: 'speak no evil monkey mouth' },
      { emoji: '🐔', keywords: 'chicken rooster farm cluck' },
      { emoji: '🐧', keywords: 'penguin antarctica cold bird' },
      { emoji: '🐦', keywords: 'bird fly tweet chirp' },
      { emoji: '🐤', keywords: 'baby chick bird yellow' },
      { emoji: '🦆', keywords: 'duck quack pond' },
      { emoji: '🦅', keywords: 'eagle bird america predator' },
      { emoji: '🦉', keywords: 'owl bird wise night' },
      { emoji: '🦇', keywords: 'bat vampire night cave' },
      { emoji: '🐺', keywords: 'wolf howl wild pack' },
      { emoji: '🐗', keywords: 'boar wild pig' },
      { emoji: '🐴', keywords: 'horse farm equestrian race' },
      { emoji: '🦄', keywords: 'unicorn magic fantasy rainbow' },
      { emoji: '🐝', keywords: 'bee honey insect buzz' },
      { emoji: '🐛', keywords: 'bug insect caterpillar' },
      { emoji: '🦋', keywords: 'butterfly insect wings pretty' },
      { emoji: '🐌', keywords: 'snail slow shell garden' },
      { emoji: '🐞', keywords: 'ladybug beetle insect luck' },
      { emoji: '🐜', keywords: 'ant insect colony' },
      { emoji: '🕷️', keywords: 'spider arachnid web' },
      { emoji: '🐢', keywords: 'turtle tortoise slow reptile' },
      { emoji: '🐍', keywords: 'snake serpent reptile venom' },
      { emoji: '🦎', keywords: 'lizard gecko reptile' },
      { emoji: '🦖', keywords: 't-rex dinosaur jurassic' },
      { emoji: '🦕', keywords: 'sauropod dinosaur brontosaurus' },
      { emoji: '🐙', keywords: 'octopus tentacles sea creature' },
      { emoji: '🦑', keywords: 'squid ocean sea creature' },
      { emoji: '🦐', keywords: 'shrimp prawn seafood' },
      { emoji: '🦀', keywords: 'crab claws seafood ocean' },
      { emoji: '🐡', keywords: 'blowfish pufferfish fish ocean' },
      { emoji: '🐠', keywords: 'tropical fish ocean aquarium' },
      { emoji: '🐟', keywords: 'fish seafood swimming' },
      { emoji: '🐬', keywords: 'dolphin ocean mammal jump' },
      { emoji: '🐳', keywords: 'spouting whale ocean mammal' },
      { emoji: '🦈', keywords: 'shark jaws predator ocean' },
      { emoji: '🐊', keywords: 'crocodile alligator swamp reptile' },
      { emoji: '🌲', keywords: 'evergreen tree pine forest nature' },
      { emoji: '🌳', keywords: 'deciduous tree nature oak' },
      { emoji: '🌴', keywords: 'palm tree beach summer tropical' },
      { emoji: '🌵', keywords: 'cactus desert plant spine' },
      { emoji: '🌸', keywords: 'cherry blossom flower pink spring' },
      { emoji: '🌹', keywords: 'rose red flower love romance' },
      { emoji: '🌻', keywords: 'sunflower yellow flower summer' },
      { emoji: '🌼', keywords: 'blossom flower yellow daisy' },
      { emoji: '🌷', keywords: 'tulip flower spring garden' },
      { emoji: '🌱', keywords: 'seedling sprout plant grow' },
      { emoji: '🌿', keywords: 'herb plant green leaf' },
      { emoji: '🍀', keywords: 'four leaf clover luck lucky irish' },
      { emoji: '🍁', keywords: 'maple leaf autumn fall canada' },
      { emoji: '🍂', keywords: 'fallen leaf autumn fall' },
      { emoji: '🍃', keywords: 'leaf flutter wind breeze' },
    ],
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: <Coffee className="h-4 w-4" />,
    emojis: [
      { emoji: '🍏', keywords: 'green apple fruit sour healthy' },
      { emoji: '🍎', keywords: 'red apple fruit sweet healthy' },
      { emoji: '🍐', keywords: 'pear fruit sweet' },
      { emoji: '🍊', keywords: 'orange tangerine citrus fruit' },
      { emoji: '🍋', keywords: 'lemon citrus yellow sour' },
      { emoji: '🍌', keywords: 'banana fruit monkey yellow' },
      { emoji: '🍉', keywords: 'watermelon melon fruit summer' },
      { emoji: '🍇', keywords: 'grapes fruit wine purple' },
      { emoji: '🍓', keywords: 'strawberry berry fruit red' },
      { emoji: '🫐', keywords: 'blueberries berry fruit blue' },
      { emoji: '🍒', keywords: 'cherries cherry fruit red pair' },
      { emoji: '🍑', keywords: 'peach fruit butt soft' },
      { emoji: '🥭', keywords: 'mango tropical fruit sweet' },
      { emoji: '🍍', keywords: 'pineapple tropical fruit sweet' },
      { emoji: '🥥', keywords: 'coconut tropical fruit nut' },
      { emoji: '🥝', keywords: 'kiwi fruit fuzzy' },
      { emoji: '🍅', keywords: 'tomato fruit vegetable salad' },
      { emoji: '🥑', keywords: 'avocado fruit vegetable guacamole' },
      { emoji: '🥦', keywords: 'broccoli vegetable green healthy' },
      { emoji: '🥒', keywords: 'cucumber pickle vegetable green' },
      { emoji: '🌶️', keywords: 'hot pepper chili spicy red' },
      { emoji: '🌽', keywords: 'ear of corn maize vegetable' },
      { emoji: '🥕', keywords: 'carrot vegetable orange bunny' },
      { emoji: '🥔', keywords: 'potato vegetable spud fries' },
      { emoji: '🥐', keywords: 'croissant bakery pastry french breakfast' },
      { emoji: '🍞', keywords: 'bread loaf toast bakery' },
      { emoji: '🥖', keywords: 'baguette bread french bakery' },
      { emoji: '🥨', keywords: 'pretzel snack twist salted' },
      { emoji: '🧀', keywords: 'cheese wedge swiss dairy' },
      { emoji: '🍳', keywords: 'cooking fried egg pan breakfast' },
      { emoji: '🥞', keywords: 'pancakes breakfast syrup butter' },
      { emoji: '🧇', keywords: 'waffle breakfast syrup iron' },
      { emoji: '🥓', keywords: 'bacon meat breakfast pork' },
      { emoji: '🍔', keywords: 'hamburger burger fast food beef' },
      { emoji: '🍟', keywords: 'french fries potato fast food' },
      { emoji: '🍕', keywords: 'pizza slice cheese pepperoni' },
      { emoji: '🌭', keywords: 'hot dog frankfurter sausage fast food' },
      { emoji: '🥪', keywords: 'sandwich lunch sub bread' },
      { emoji: '🌮', keywords: 'taco mexican food shell' },
      { emoji: '🌯', keywords: 'burrito mexican food wrap' },
      { emoji: '🥗', keywords: 'green salad healthy vegetables' },
      { emoji: '🍝', keywords: 'spaghetti pasta italian noodles' },
      { emoji: '🍜', keywords: 'steaming bowl ramen soup noodles' },
      { emoji: '🍲', keywords: 'pot of food stew soup curry' },
      { emoji: '🍛', keywords: 'curry rice indian food spicy' },
      { emoji: '🍣', keywords: 'sushi japanese food fish rice' },
      { emoji: '🍱', keywords: 'bento box japanese lunch meal' },
      { emoji: '🥟', keywords: 'dumpling potsticker dim sum' },
      { emoji: '🍤', keywords: 'fried shrimp tempura seafood' },
      { emoji: '🍙', keywords: 'rice ball onigiri nori japanese' },
      { emoji: '🍚', keywords: 'cooked rice bowl staple' },
      { emoji: '🍨', keywords: 'ice cream dessert sweet dairy' },
      { emoji: '🍦', keywords: 'soft ice cream cone swirl' },
      { emoji: '🥧', keywords: 'pie dessert baked crust' },
      { emoji: '🧁', keywords: 'cupcake dessert sweet muffin' },
      { emoji: '🍰', keywords: 'shortcake cake dessert strawberry' },
      { emoji: '🎂', keywords: 'birthday cake celebration candles' },
      { emoji: '🍮', keywords: 'custard pudding flan dessert' },
      { emoji: '🍭', keywords: 'lollipop candy sweet treat' },
      { emoji: '🍬', keywords: 'candy sweet treat wrapper' },
      { emoji: '🍫', keywords: 'chocolate bar sweet cacao' },
      { emoji: '🍿', keywords: 'popcorn movie snack cinema' },
      { emoji: '🍩', keywords: 'doughnut donut pastry sweet glaze' },
      { emoji: '🍪', keywords: 'cookie chocolate chip sweet bake' },
      { emoji: '☕', keywords: 'hot beverage coffee tea cup espresso' },
      { emoji: '🫖', keywords: 'teapot tea pot brew' },
      { emoji: '🍵', keywords: 'teacup without handle matcha green tea' },
      { emoji: '🍶', keywords: 'sake bottle cup japanese rice wine' },
      { emoji: '🍷', keywords: 'wine glass red alcohol drink' },
      { emoji: '🍸', keywords: 'cocktail glass martini olive alcohol' },
      { emoji: '🍹', keywords: 'tropical drink cocktail summer fruity' },
      { emoji: '🍺', keywords: 'beer mug alcohol pub lager' },
      { emoji: '🍻', keywords: 'clinking beer mugs cheers toast' },
      { emoji: '🥂', keywords: 'clinking glasses champagne toast celebrate' },
      { emoji: '🥃', keywords: 'tumbler glass whiskey scotch bourbon' },
      { emoji: '🥤', keywords: 'cup with straw soda boba drink' },
      { emoji: '🧋', keywords: 'bubble tea boba milk drink' },
    ],
  },
  {
    id: 'travel',
    name: 'Travel & Places',
    icon: <Car className="h-4 w-4" />,
    emojis: [
      { emoji: '🚗', keywords: 'automobile car red drive vehicle' },
      { emoji: '🚕', keywords: 'taxi cab yellow ride car' },
      { emoji: '🚙', keywords: 'suv blue car vehicle' },
      { emoji: '🚌', keywords: 'bus transit school commute' },
      { emoji: '🚎', keywords: 'trolleybus transit' },
      { emoji: '🏎️', keywords: 'racing car race track formula fast' },
      { emoji: '🚓', keywords: 'police car siren law emergency' },
      { emoji: '🚑', keywords: 'ambulance emergency hospital medical' },
      { emoji: '🚒', keywords: 'fire engine truck emergency rescue' },
      { emoji: '🚐', keywords: 'minibus van travel transport' },
      { emoji: '🚚', keywords: 'delivery truck cargo logistics' },
      { emoji: '🚛', keywords: 'articulated lorry semi truck big rig' },
      { emoji: '🚜', keywords: 'tractor farm agricultural machine' },
      { emoji: '🛴', keywords: 'kick scooter transport city' },
      { emoji: '🚲', keywords: 'bicycle bike cycling wheels eco' },
      { emoji: '🛵', keywords: 'motor scooter moped vespa' },
      { emoji: '🏍️', keywords: 'motorcycle motorbike bike speed' },
      { emoji: '🚨', keywords: 'police car light siren flashing alarm' },
      { emoji: '🚆', keywords: 'train railway transit transport' },
      { emoji: '🚅', keywords: 'bullet train shinkansen high speed' },
      { emoji: '🚇', keywords: 'metro subway underground transit' },
      { emoji: '🛩️', keywords: 'small airplane plane flight travel' },
      { emoji: '✈️', keywords: 'airplane plane flight travel airport' },
      { emoji: '🛫', keywords: 'airplane departure takeoff airport' },
      { emoji: '🛬', keywords: 'airplane arrival landing airport' },
      { emoji: '🚀', keywords: 'rocket space launch moonship blastoff' },
      { emoji: '🛸', keywords: 'flying saucer ufo alien extraterrestrial' },
      { emoji: '🚁', keywords: 'helicopter chopper fly pilot' },
      { emoji: '⛵', keywords: 'sailboat boat yacht ocean sea' },
      { emoji: '🚤', keywords: 'speedboat motorboat water lake' },
      { emoji: '🛳️', keywords: 'passenger ship cruise liner vessel' },
      { emoji: '⚓', keywords: 'anchor ship boat harbor naval' },
      { emoji: '⛽', keywords: 'fuel pump gas station petrol' },
      { emoji: '🗽', keywords: 'statue of liberty new york america landmark' },
      { emoji: '🗼', keywords: 'tokyo tower japan landmark' },
      { emoji: '🏰', keywords: 'castle fairy palace medieval' },
      { emoji: '🏟️', keywords: 'stadium arena sports concert' },
      { emoji: '🏕️', keywords: 'camping tent outdoors mountain' },
      { emoji: '🏖️', keywords: 'beach with umbrella summer tropical ocean' },
      { emoji: '🏜️', keywords: 'desert sand dunes hot' },
      { emoji: '🏝️', keywords: 'desert island ocean tropical' },
      { emoji: '🌋', keywords: 'volcano lava eruption mountain' },
      { emoji: '🏔️', keywords: 'snow capped mountain nature cold' },
    ],
  },
  {
    id: 'activities',
    name: 'Activities & Sports',
    icon: <Trophy className="h-4 w-4" />,
    emojis: [
      { emoji: '⚽', keywords: 'soccer ball football sports goal' },
      { emoji: '🏀', keywords: 'basketball ball sports hoop dunk' },
      { emoji: '🏈', keywords: 'american football ball sports nfl' },
      { emoji: '⚾', keywords: 'baseball ball sports strike' },
      { emoji: '🥎', keywords: 'softball ball sports pitch' },
      { emoji: '🎾', keywords: 'tennis ball racket match court' },
      { emoji: '🏐', keywords: 'volleyball ball sports beach' },
      { emoji: '🏉', keywords: 'rugby football ball sports' },
      { emoji: '🎱', keywords: 'pool 8 ball billiards game' },
      { emoji: '🏓', keywords: 'ping pong table tennis paddle ball' },
      { emoji: '🏸', keywords: 'badminton racket shuttlecock game' },
      { emoji: '🥊', keywords: 'boxing glove punch fighter combat' },
      { emoji: '🥋', keywords: 'martial arts uniform karate judo belt' },
      { emoji: '🏹', keywords: 'bow and arrow archery bullseye target' },
      { emoji: '🎣', keywords: 'fishing pole fish hook catch' },
      { emoji: '🤿', keywords: 'diving mask snorkel underwater ocean' },
      { emoji: '🎽', keywords: 'running shirt sash marathon athlete' },
      { emoji: '🛹', keywords: 'skateboard skate deck ollie' },
      { emoji: '🛼', keywords: 'roller skate skates rink retro' },
      { emoji: '⛷️', keywords: 'skier ski snow winter mountain' },
      { emoji: '🏂', keywords: 'snowboarder snow winter mountain' },
      { emoji: '🏋️', keywords: 'weightlifter gym weights barbell fitness' },
      { emoji: '🏆', keywords: 'trophy prize award winner champion cup' },
      { emoji: '🥇', keywords: '1st place medal gold winner' },
      { emoji: '🥈', keywords: '2nd place medal silver' },
      { emoji: '🥉', keywords: '3rd place medal bronze' },
      { emoji: '🏅', keywords: 'sports medal ribbon award' },
      { emoji: '🎯', keywords: 'bullseye direct hit dart target aim' },
      { emoji: '🎮', keywords: 'video game controller console play gamer' },
      { emoji: '🎲', keywords: 'game die dice rolling luck chance' },
      { emoji: '♟️', keywords: 'chess pawn game strategy checkmate' },
      { emoji: '🎰', keywords: 'slot machine casino jackpot gamble' },
      { emoji: '🧩', keywords: 'puzzle piece jigsaw game solve' },
    ],
  },
  {
    id: 'objects',
    name: 'Objects & Tech',
    icon: <Lightbulb className="h-4 w-4" />,
    emojis: [
      { emoji: '📱', keywords: 'mobile phone cell smartphone call' },
      { emoji: '📲', keywords: 'mobile phone with arrow call screen' },
      { emoji: '💻', keywords: 'laptop computer pc tech screen' },
      { emoji: '🖥️', keywords: 'desktop computer monitor screen pc' },
      { emoji: '🖨️', keywords: 'printer print paper document' },
      { emoji: '⌨️', keywords: 'keyboard typing computer input' },
      { emoji: '🖱️', keywords: 'computer mouse click pointer' },
      { emoji: '📷', keywords: 'camera photo photograph picture lens' },
      { emoji: '📸', keywords: 'camera with flash snapshot photo' },
      { emoji: '📹', keywords: 'video camera camcorder recording' },
      { emoji: '🎥', keywords: 'movie camera film cinema video' },
      { emoji: '📽️', keywords: 'film projector movie cinema video' },
      { emoji: '💡', keywords: 'light bulb idea bright light electricity' },
      { emoji: '🔦', keywords: 'flashlight torch light beam' },
      { emoji: '📖', keywords: 'open book reading literature novel' },
      { emoji: '📚', keywords: 'books library study reading school' },
      { emoji: '💵', keywords: 'dollar banknote money currency cash usd' },
      { emoji: '💰', keywords: 'money bag cash rich dollar wealth' },
      { emoji: '💳', keywords: 'credit card payment money bank debit' },
      { emoji: '💎', keywords: 'gem stone diamond jewel precious' },
      { emoji: '🔑', keywords: 'key lock password security access' },
      { emoji: '🗝️', keywords: 'old key antique lock password' },
      { emoji: '🔒', keywords: 'locked padlock security safe e2ee' },
      { emoji: '🔓', keywords: 'unlocked padlock open security' },
      { emoji: '🔔', keywords: 'bell notification alert alarm ring' },
      { emoji: '⏰', keywords: 'alarm clock time wake morning' },
      { emoji: '⏱️', keywords: 'stopwatch timer measure speed' },
      { emoji: '⏳', keywords: 'hourglass not done time sand passing' },
      { emoji: '✉️', keywords: 'envelope email letter mail message' },
      { emoji: '📦', keywords: 'package box delivery parcel shipping' },
      { emoji: '🎁', keywords: 'wrapped gift present birthday surprise' },
      { emoji: '🛒', keywords: 'shopping cart buy ecommerce store' },
    ],
  },
  {
    id: 'symbols',
    name: 'Symbols & Hearts',
    icon: <Heart className="h-4 w-4" />,
    emojis: [
      { emoji: '❤️', keywords: 'red heart love romance affection' },
      { emoji: '🧡', keywords: 'orange heart love affection warm' },
      { emoji: '💛', keywords: 'yellow heart love friendship' },
      { emoji: '💚', keywords: 'green heart love nature eco' },
      { emoji: '💙', keywords: 'blue heart love peace trust' },
      { emoji: '💜', keywords: 'purple heart love magic royal' },
      { emoji: '🖤', keywords: 'black heart dark emo love' },
      { emoji: '🤍', keywords: 'white heart pure love peace' },
      { emoji: '🤎', keywords: 'brown heart love earth warm' },
      { emoji: '💔', keywords: 'broken heart sadness heartbreak breakup' },
      { emoji: '❣️', keywords: 'heart exclamation love punctuation' },
      { emoji: '💕', keywords: 'two hearts pink love affection' },
      { emoji: '💞', keywords: 'revolving hearts love pink swirl' },
      { emoji: '💓', keywords: 'beating heart love pulse pink' },
      { emoji: '💗', keywords: 'growing heart love pink pulse' },
      { emoji: '💖', keywords: 'sparkling heart love sparkle shine' },
      { emoji: '💘', keywords: 'heart with arrow cupid love romance' },
      { emoji: '💝', keywords: 'heart with ribbon gift present love' },
      { emoji: '🔥', keywords: 'fire flame lit hot blaze trending' },
      { emoji: '✨', keywords: 'sparkles stars shine magic clean' },
      { emoji: '⭐', keywords: 'star yellow rating favorite night' },
      { emoji: '🌟', keywords: 'glowing star shine bright sparkle' },
      { emoji: '⚡', keywords: 'high voltage lightning bolt zap energy' },
      { emoji: '💥', keywords: 'collision boom bang explosion blast' },
      { emoji: '🎉', keywords: 'party popper celebration confetti surprise' },
      { emoji: '🎊', keywords: 'confetti ball celebration party' },
      { emoji: '💯', keywords: 'hundred points score perfect keep it 100' },
      { emoji: '✅', keywords: 'check mark button verify ok done complete' },
      { emoji: '✔️', keywords: 'check mark check tick ok' },
      { emoji: '❌', keywords: 'cross mark cancel no wrong delete' },
      { emoji: '⚠️', keywords: 'warning sign caution alert danger' },
      { emoji: '⛔', keywords: 'no entry stop forbidden sign' },
      { emoji: '🛑', keywords: 'stop sign octagon red halt' },
      { emoji: '🛡️', keywords: 'shield protect defense security guard' },
      { emoji: '🔒', keywords: 'locked privacy security safe encrypted' },
    ],
  },
  {
    id: 'flags',
    name: 'Flags',
    icon: <Flag className="h-4 w-4" />,
    emojis: [
      { emoji: '🇮🇳', keywords: 'flag india indian national tiranga' },
      { emoji: '🇺🇸', keywords: 'flag united states usa america' },
      { emoji: '🇬🇧', keywords: 'flag united kingdom uk britain union jack' },
      { emoji: '🇨🇦', keywords: 'flag canada maple leaf' },
      { emoji: '🇦🇺', keywords: 'flag australia' },
      { emoji: '🇩🇪', keywords: 'flag germany german' },
      { emoji: '🇫🇷', keywords: 'flag france french' },
      { emoji: '🇯🇵', keywords: 'flag japan japanese rising sun' },
      { emoji: '🇨🇳', keywords: 'flag china chinese' },
      { emoji: '🇧🇷', keywords: 'flag brazil brazilian' },
      { emoji: '🇷🇺', keywords: 'flag russia russian' },
      { emoji: '🇰🇷', keywords: 'flag south korea korean' },
      { emoji: '🇮🇹', keywords: 'flag italy italian' },
      { emoji: '🇪🇸', keywords: 'flag spain spanish' },
      { emoji: '🇲🇽', keywords: 'flag mexico mexican' },
      { emoji: '🏁', keywords: 'chequered flag race finish line' },
      { emoji: '🚩', keywords: 'triangular flag red post golf' },
      { emoji: '🏳️‍🌈', keywords: 'rainbow flag pride lgbtq' },
      { emoji: '🏳️‍⚧️', keywords: 'transgender flag pride trans' },
      { emoji: '🏴‍☠️', keywords: 'pirate flag skull crossbones jolly roger' },
    ],
  },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelectEmoji, onClose }) => {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('safechat_recent_emojis');
      return stored ? JSON.parse(stored) : ['😊', '❤️', '👍', '🔥', '😂', '🎉', '🙏', '✨'];
    } catch {
      return ['😊', '❤️', '👍', '🔥', '😂', '🎉', '🙏', '✨'];
    }
  });

  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const handleSelect = (emoji: string) => {
    onSelectEmoji(emoji);
    // Add to recent
    setRecentEmojis((prev) => {
      const filtered = prev.filter((e) => e !== emoji);
      const updated = [emoji, ...filtered].slice(0, 16);
      try {
        localStorage.setItem('safechat_recent_emojis', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Filter emojis based on search query
  const filteredEmojis = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;

    const matches: string[] = [];
    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (item.keywords.toLowerCase().includes(query) || item.emoji.includes(query)) {
          matches.push(item.emoji);
        }
      }
    }
    return matches;
  }, [searchQuery]);

  const currentCategory = useMemo(() => {
    return EMOJI_CATEGORIES.find((c) => c.id === activeCategoryId) || EMOJI_CATEGORIES[0];
  }, [activeCategoryId]);

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-16 right-0 sm:right-6 z-50 flex flex-col w-[340px] sm:w-[380px] h-[400px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 text-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* Header & Search */}
      <div className="p-3 border-b border-slate-100 flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all emojis..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 placeholder-slate-400"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          title="Close emoji keypad"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Category Tabs (if not searching) */}
      {!searchQuery && (
        <div className="flex items-center px-2 py-1.5 border-b border-slate-100 bg-slate-50/70 overflow-x-auto no-scrollbar gap-1">
          <button
            type="button"
            onClick={() => setActiveCategoryId('recent')}
            className={`flex items-center justify-center h-8 w-8 rounded-xl transition-all shrink-0 ${
              activeCategoryId === 'recent'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-500 hover:bg-slate-200/80 hover:text-slate-800'
            }`}
            title="Recently Used"
          >
            <Clock className="h-4 w-4" />
          </button>

          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryId(cat.id)}
              className={`flex items-center justify-center h-8 w-8 rounded-xl transition-all shrink-0 ${
                activeCategoryId === cat.id
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:bg-slate-200/80 hover:text-slate-800'
              }`}
              title={cat.name}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid Area */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {filteredEmojis !== null ? (
          /* Search Results */
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Search Results ({filteredEmojis.length})
            </div>
            {filteredEmojis.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 text-xs">
                <Smile className="h-8 w-8 mb-2 opacity-50" />
                <span>No emojis found for "{searchQuery}"</span>
              </div>
            ) : (
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
                {filteredEmojis.map((emoji, idx) => (
                  <button
                    key={`${emoji}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(emoji)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-xl hover:bg-emerald-50 hover:scale-125 transition-transform active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : activeCategoryId === 'recent' ? (
          /* Recent Emojis View */
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Recently Used
            </div>
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
              {recentEmojis.map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(emoji)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-xl hover:bg-emerald-50 hover:scale-125 transition-transform active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active Category Emojis */
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{currentCategory.name}</span>
              <span className="text-[10px] text-slate-400 font-normal">{currentCategory.emojis.length} emojis</span>
            </div>
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
              {currentCategory.emojis.map((item, idx) => (
                <button
                  key={`${item.emoji}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(item.emoji)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-xl hover:bg-emerald-50 hover:scale-125 transition-transform active:scale-95"
                  title={item.keywords}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Click any emoji to insert into chat</span>
        <span className="font-mono">SafeChat Keypad</span>
      </div>
    </div>
  );
};
