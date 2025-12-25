import { WordModel } from '@models';
import { logger } from '@utils';
import { generateId } from '@utils';

/**
 * Migration: Add Nigerian native words - colors, cars, extended food, Yoruba, Hausa, Pidgin
 * Focus on native Nigerian terminology and slang
 */

interface WordEntry {
  word: string;
  category: string;
  difficulty?: number;
  aliases?: string[];
}

const nigerianNativeWords: WordEntry[] = [
  // NIGERIAN NATIVE COLOR NAMES (Yoruba/Pidgin names for colors)
  { word: 'funfun', category: 'color', difficulty: 1, aliases: ['white'] }, // Yoruba: white
  { word: 'dudu', category: 'color', difficulty: 1, aliases: ['black'] }, // Yoruba: black
  { word: 'pupa', category: 'color', difficulty: 1, aliases: ['red'] }, // Yoruba: red
  { word: 'sanyan', category: 'color', difficulty: 2, aliases: ['brown'] }, // Yoruba: brown
  { word: 'ewe', category: 'color', difficulty: 1, aliases: ['green'] }, // Yoruba: green/leaf
  { word: 'aro', category: 'color', difficulty: 2, aliases: ['indigo'] }, // Yoruba: indigo
  { word: 'buruku', category: 'color', difficulty: 2, aliases: ['dark'] }, // Yoruba: dark
  { word: 'ash', category: 'color', difficulty: 1, aliases: ['grey', 'gray'] }, // Pidgin: grey
  { word: 'wine', category: 'color', difficulty: 1, aliases: ['maroon'] }, // Nigerian: wine/maroon
  { word: 'navy blue', category: 'color', difficulty: 1, aliases: ['navy'] },
  { word: 'sky blue', category: 'color', difficulty: 1, aliases: ['sky'] },
  { word: 'lemon', category: 'color', difficulty: 1, aliases: ['lemon yellow'] },
  { word: 'cream', category: 'color', difficulty: 1, aliases: ['off-white'] },
  { word: 'coral', category: 'color', difficulty: 1 },
  { word: 'peach', category: 'color', difficulty: 1 },

  // NIGERIAN CAR/VEHICLE SLANG AND NATIVE NAMES
  { word: 'molue', category: 'car', difficulty: 1 }, // Lagos big bus
  { word: 'kabu kabu', category: 'car', difficulty: 1, aliases: ['kabu'] }, // Unofficial taxi
  { word: 'korope', category: 'car', difficulty: 2 }, // Old Mercedes Benz
  { word: 'tokunbo', category: 'car', difficulty: 1 }, // Foreign used car
  { word: 'tear rubber', category: 'car', difficulty: 2, aliases: ['brand new'] }, // Brand new car
  { word: 'ijapa', category: 'car', difficulty: 1 }, // Volkswagen Beetle (tortoise)
  { word: 'end of discussion', category: 'car', difficulty: 2 }, // Mercedes Benz W124
  { word: 'v-boot', category: 'car', difficulty: 1 }, // Peugeot 504/505
  { word: 'bullion van', category: 'car', difficulty: 1 },
  { word: 'trailer', category: 'car', difficulty: 1 },
  { word: 'lorry', category: 'car', difficulty: 1 },
  { word: 'truck', category: 'car', difficulty: 1 },

  // EXTENDED NIGERIAN FOOD WITH PROPER ALIASES
  { word: 'ewedu soup', category: 'food', difficulty: 1, aliases: ['ewedu'] },
  { word: 'okra soup', category: 'food', difficulty: 1, aliases: ['okra', 'okro soup', 'okro'] },
  { word: 'ogbono', category: 'food', difficulty: 1, aliases: ['ogbono soup', 'draw soup'] },
  { word: 'egusi', category: 'food', difficulty: 1, aliases: ['egusi soup', 'melon soup'] },
  { word: 'afang', category: 'food', difficulty: 1, aliases: ['afang soup'] },
  { word: 'banga soup', category: 'food', difficulty: 1, aliases: ['banga', 'palm nut soup'] },
  { word: 'oha', category: 'food', difficulty: 1, aliases: ['oha soup', 'ora soup', 'ofe oha'] },
  { word: 'nsala', category: 'food', difficulty: 1, aliases: ['nsala soup', 'white soup'] },
  { word: 'bitter leaf', category: 'food', difficulty: 1, aliases: ['bitterleaf soup', 'bitter leaf soup'] },
  { word: 'edikang ikong', category: 'food', difficulty: 2, aliases: ['edikaikong'] },
  { word: 'fisherman soup', category: 'food', difficulty: 1, aliases: ['fisherman'] },
  { word: 'ofe nsala', category: 'food', difficulty: 2, aliases: ['ofe-nsala'] },
  { word: 'ukwa', category: 'food', difficulty: 1, aliases: ['breadfruit'] },
  { word: 'abacha', category: 'food', difficulty: 1, aliases: ['african salad'] },
  { word: 'nkwobi', category: 'food', difficulty: 1 },
  { word: 'isi ewu', category: 'food', difficulty: 1, aliases: ['goat head'] },
  { word: 'asaro', category: 'food', difficulty: 1, aliases: ['yam porridge', 'porridge yam'] },
  { word: 'adalu', category: 'food', difficulty: 1, aliases: ['beans and corn'] },
  { word: 'ewa agoyin', category: 'food', difficulty: 1, aliases: ['ewa'] },
  { word: 'moi moi', category: 'food', difficulty: 1, aliases: ['moimoi', 'bean cake'] },
  { word: 'akara', category: 'food', difficulty: 1, aliases: ['bean balls', 'kosai'] },
  { word: 'kosai', category: 'food', difficulty: 1, aliases: ['akara'] }, // Hausa name
  { word: 'danwake', category: 'food', difficulty: 2, aliases: ['dan wake'] },
  { word: 'miyan kuka', category: 'food', difficulty: 2, aliases: ['kuka soup'] },
  { word: 'miyan taushe', category: 'food', difficulty: 2, aliases: ['pumpkin soup'] },
  { word: 'dambu nama', category: 'food', difficulty: 2, aliases: ['dried meat'] },
  { word: 'suya', category: 'food', difficulty: 1, aliases: ['tsire'] },
  { word: 'kilishi', category: 'food', difficulty: 1 },
  { word: 'gurasa', category: 'food', difficulty: 2 },
  { word: 'fura', category: 'food', difficulty: 1, aliases: ['fura da nono'] },
  { word: 'kunu', category: 'food', difficulty: 1, aliases: ['kunun zaki', 'kunun aya'] },
  { word: 'zobo', category: 'food', difficulty: 1, aliases: ['zoborodo', 'hibiscus drink'] },
  { word: 'pap', category: 'food', difficulty: 1, aliases: ['akamu', 'ogi', 'koko'] },
  { word: 'agidi', category: 'food', difficulty: 1, aliases: ['eko'] },
  { word: 'gbegiri', category: 'food', difficulty: 1, aliases: ['bean soup'] },
  { word: 'ofada', category: 'food', difficulty: 1, aliases: ['ofada rice'] },
  { word: 'ayamase', category: 'food', difficulty: 1, aliases: ['ofada stew', 'designer stew'] },
  { word: 'boli', category: 'food', difficulty: 1, aliases: ['roasted plantain'] },
  { word: 'yamarita', category: 'food', difficulty: 1, aliases: ['yam and egg'] },
  { word: 'dun dun', category: 'food', difficulty: 1, aliases: ['dundun', 'fried yam'] },
  { word: 'gizdodo', category: 'food', difficulty: 1, aliases: ['gizzard and plantain'] },
  { word: 'asun', category: 'food', difficulty: 1, aliases: ['spicy goat meat'] },
  { word: 'peppered snail', category: 'food', difficulty: 1, aliases: ['snail'] },
  { word: 'nkwobi', category: 'food', difficulty: 1, aliases: ['cow foot'] },
  { word: 'goat meat pepper soup', category: 'food', difficulty: 2, aliases: ['goat pepper soup'] },
  { word: 'catfish pepper soup', category: 'food', difficulty: 2, aliases: ['point and kill'] },
  { word: 'bush meat', category: 'food', difficulty: 1, aliases: ['bushmeat'] },
  { word: 'stockfish', category: 'food', difficulty: 1, aliases: ['okporoko'] },
  { word: 'crayfish', category: 'food', difficulty: 1 },
  { word: 'periwinkle', category: 'food', difficulty: 1, aliases: ['isam'] },
  { word: 'ugba', category: 'food', difficulty: 1, aliases: ['ukpaka', 'oil bean'] },
  { word: 'kpomo', category: 'food', difficulty: 1, aliases: ['ponmo', 'cow skin'] },
  { word: 'shaki', category: 'food', difficulty: 1, aliases: ['shaky', 'tripe'] },
  { word: 'chin chin', category: 'food', difficulty: 1, aliases: ['chinchin'] },
  { word: 'puff puff', category: 'food', difficulty: 1, aliases: ['puffpuff'] },
  { word: 'buns', category: 'food', difficulty: 1 },
  { word: 'meat pie', category: 'food', difficulty: 1, aliases: ['meatpie'] },
  { word: 'sausage roll', category: 'food', difficulty: 1 },
  { word: 'fish roll', category: 'food', difficulty: 1 },
  { word: 'gala', category: 'food', difficulty: 1 },
  { word: 'la casera', category: 'food', difficulty: 1, aliases: ['lacasera'] },
  { word: 'malta guinness', category: 'food', difficulty: 1, aliases: ['malta'] },
  { word: 'supermalt', category: 'food', difficulty: 1 },
  { word: 'chapman', category: 'food', difficulty: 1 },
  { word: 'epa', category: 'food', difficulty: 1, aliases: ['groundnut', 'peanuts'] },
  { word: 'coconut candy', category: 'food', difficulty: 1 },
  { word: 'banana cake', category: 'food', difficulty: 1 },

  // MORE YORUBA NAMES
  { word: 'abidemi', category: 'name', difficulty: 1 },
  { word: 'abiodun', category: 'name', difficulty: 1, aliases: ['biodun'] },
  { word: 'abiola', category: 'name', difficulty: 1 },
  { word: 'adegbola', category: 'name', difficulty: 1 },
  { word: 'adekunle', category: 'name', difficulty: 1 },
  { word: 'aderemi', category: 'name', difficulty: 1 },
  { word: 'adesina', category: 'name', difficulty: 1 },
  { word: 'adesuwa', category: 'name', difficulty: 1 },
  { word: 'adewale', category: 'name', difficulty: 1 },
  { word: 'adewole', category: 'name', difficulty: 1 },
  { word: 'adewunmi', category: 'name', difficulty: 1 },
  { word: 'adeyinka', category: 'name', difficulty: 1 },
  { word: 'adigun', category: 'name', difficulty: 1 },
  { word: 'agboola', category: 'name', difficulty: 1 },
  { word: 'ajakaiye', category: 'name', difficulty: 2 },
  { word: 'akanbi', category: 'name', difficulty: 1 },
  { word: 'akanni', category: 'name', difficulty: 1 },
  { word: 'akinsola', category: 'name', difficulty: 1 },
  { word: 'akintayo', category: 'name', difficulty: 1 },
  { word: 'akintoye', category: 'name', difficulty: 1 },
  { word: 'alabi', category: 'name', difficulty: 1 },
  { word: 'alake', category: 'name', difficulty: 1 },
  { word: 'anike', category: 'name', difficulty: 1 },
  { word: 'aremu', category: 'name', difficulty: 1 },
  { word: 'asake', category: 'name', difficulty: 1 },
  { word: 'asiwaju', category: 'name', difficulty: 1 },
  { word: 'atanda', category: 'name', difficulty: 1 },
  { word: 'awolowo', category: 'name', difficulty: 1 },
  { word: 'badmus', category: 'name', difficulty: 1 },
  { word: 'balogun', category: 'name', difficulty: 1 },
  { word: 'bamidele', category: 'name', difficulty: 1, aliases: ['bami'] },
  { word: 'bankole', category: 'name', difficulty: 1 },
  { word: 'basirat', category: 'name', difficulty: 1 },
  { word: 'biodun', category: 'name', difficulty: 1 },
  { word: 'busola', category: 'name', difficulty: 1 },
  { word: 'damola', category: 'name', difficulty: 1 },
  { word: 'dunni', category: 'name', difficulty: 1 },
  { word: 'dupe', category: 'name', difficulty: 1 },
  { word: 'ebun', category: 'name', difficulty: 1 },
  { word: 'enitan', category: 'name', difficulty: 1 },
  { word: 'fadeke', category: 'name', difficulty: 1 },
  { word: 'fajuyi', category: 'name', difficulty: 1 },
  { word: 'falilat', category: 'name', difficulty: 1 },
  { word: 'fayemi', category: 'name', difficulty: 1 },
  { word: 'fela', category: 'name', difficulty: 1 },
  { word: 'femi', category: 'name', difficulty: 1 },
  { word: 'gbadebo', category: 'name', difficulty: 1 },
  { word: 'gbemisola', category: 'name', difficulty: 1, aliases: ['gbemi'] },
  { word: 'ifelolu', category: 'name', difficulty: 1 },
  { word: 'ifeoluwa', category: 'name', difficulty: 1 },
  { word: 'ige', category: 'name', difficulty: 1 },
  { word: 'jadesola', category: 'name', difficulty: 1, aliases: ['jade'] },
  { word: 'jide', category: 'name', difficulty: 1 },
  { word: 'kanyinsola', category: 'name', difficulty: 1 },
  { word: 'kayode', category: 'name', difficulty: 1 },
  { word: 'kolawole', category: 'name', difficulty: 1, aliases: ['kola'] },
  { word: 'ladi', category: 'name', difficulty: 1 },
  { word: 'lanre', category: 'name', difficulty: 1 },
  { word: 'laolu', category: 'name', difficulty: 1 },
  { word: 'morayo', category: 'name', difficulty: 1 },
  { word: 'morenikeji', category: 'name', difficulty: 2, aliases: ['moreni'] },
  { word: 'motunrayo', category: 'name', difficulty: 1 },
  { word: 'niyi', category: 'name', difficulty: 1 },
  { word: 'oba', category: 'name', difficulty: 1 },
  { word: 'obafemi', category: 'name', difficulty: 1 },
  { word: 'ojo', category: 'name', difficulty: 1 },
  { word: 'oke', category: 'name', difficulty: 1 },
  { word: 'okeowo', category: 'name', difficulty: 1 },
  { word: 'oladapo', category: 'name', difficulty: 1 },
  { word: 'olaitan', category: 'name', difficulty: 1 },
  { word: 'olajide', category: 'name', difficulty: 1 },
  { word: 'olajumoke', category: 'name', difficulty: 1 },
  { word: 'olakunle', category: 'name', difficulty: 1 },
  { word: 'olalekan', category: 'name', difficulty: 1 },
  { word: 'olamiji', category: 'name', difficulty: 1 },
  { word: 'olanike', category: 'name', difficulty: 1 },
  { word: 'olanrewaju', category: 'name', difficulty: 1 },
  { word: 'olasunkanmi', category: 'name', difficulty: 2 },
  { word: 'olatunde', category: 'name', difficulty: 1 },
  { word: 'olatunji', category: 'name', difficulty: 1 },
  { word: 'olubukola', category: 'name', difficulty: 1, aliases: ['bukola'] },
  { word: 'oludare', category: 'name', difficulty: 1 },
  { word: 'olufunke', category: 'name', difficulty: 1 },
  { word: 'olufunmilayo', category: 'name', difficulty: 2, aliases: ['funmi'] },
  { word: 'olukayode', category: 'name', difficulty: 1 },
  { word: 'olurotimi', category: 'name', difficulty: 1, aliases: ['rotimi'] },
  { word: 'olushola', category: 'name', difficulty: 1 },
  { word: 'oluwabukunmi', category: 'name', difficulty: 2 },
  { word: 'oluwadarasimi', category: 'name', difficulty: 2 },
  { word: 'oluwadamilare', category: 'name', difficulty: 2 },
  { word: 'oluwadamilola', category: 'name', difficulty: 2 },
  { word: 'oluwafemi', category: 'name', difficulty: 1 },
  { word: 'oluwakemi', category: 'name', difficulty: 1 },
  { word: 'oluwaloni', category: 'name', difficulty: 1 },
  { word: 'oluwarotimi', category: 'name', difficulty: 2 },
  { word: 'oluwatobi', category: 'name', difficulty: 1 },
  { word: 'oluwatoyin', category: 'name', difficulty: 1, aliases: ['toyin'] },
  { word: 'omolola', category: 'name', difficulty: 1, aliases: ['lola'] },
  { word: 'omolade', category: 'name', difficulty: 1 },
  { word: 'opeyemi', category: 'name', difficulty: 1, aliases: ['ope'] },
  { word: 'ore', category: 'name', difficulty: 1 },
  { word: 'oreofe', category: 'name', difficulty: 1 },
  { word: 'remilekun', category: 'name', difficulty: 1, aliases: ['remi'] },
  { word: 'rotimi', category: 'name', difficulty: 1 },
  { word: 'sanya', category: 'name', difficulty: 1 },
  { word: 'sekinat', category: 'name', difficulty: 1 },
  { word: 'seun', category: 'name', difficulty: 1 },
  { word: 'shade', category: 'name', difficulty: 1 },
  { word: 'shina', category: 'name', difficulty: 1 },
  { word: 'sola', category: 'name', difficulty: 1 },
  { word: 'solape', category: 'name', difficulty: 1 },
  { word: 'suliat', category: 'name', difficulty: 1 },
  { word: 'tinuke', category: 'name', difficulty: 1 },
  { word: 'tobi', category: 'name', difficulty: 1 },
  { word: 'tobiloba', category: 'name', difficulty: 1 },
  { word: 'tosin', category: 'name', difficulty: 1 },
  { word: 'tunde', category: 'name', difficulty: 1 },
  { word: 'tunji', category: 'name', difficulty: 1 },
  { word: 'wale', category: 'name', difficulty: 1 },
  { word: 'wasiu', category: 'name', difficulty: 1 },
  { word: 'yejide', category: 'name', difficulty: 1 },
  { word: 'yewande', category: 'name', difficulty: 1 },

  // MORE HAUSA NAMES
  { word: 'abdullahi', category: 'name', difficulty: 1 },
  { word: 'abubakar', category: 'name', difficulty: 1 },
  { word: 'adamu', category: 'name', difficulty: 1 },
  { word: 'ahmad', category: 'name', difficulty: 1 },
  { word: 'aliyu', category: 'name', difficulty: 1 },
  { word: 'amina', category: 'name', difficulty: 1 },
  { word: 'asabe', category: 'name', difficulty: 1 },
  { word: 'bilkisu', category: 'name', difficulty: 1 },
  { word: 'buhari', category: 'name', difficulty: 1 },
  { word: 'danjuma', category: 'name', difficulty: 1 },
  { word: 'garba', category: 'name', difficulty: 1 },
  { word: 'habiba', category: 'name', difficulty: 1 },
  { word: 'hadiza', category: 'name', difficulty: 1 },
  { word: 'hamza', category: 'name', difficulty: 1 },
  { word: 'ibrahim', category: 'name', difficulty: 1 },
  { word: 'isa', category: 'name', difficulty: 1 },
  { word: 'jamila', category: 'name', difficulty: 1 },
  { word: 'kabiru', category: 'name', difficulty: 1 },
  { word: 'khadija', category: 'name', difficulty: 1 },
  { word: 'lawal', category: 'name', difficulty: 1 },
  { word: 'mahmud', category: 'name', difficulty: 1 },
  { word: 'maryam', category: 'name', difficulty: 1 },
  { word: 'muhammed', category: 'name', difficulty: 1 },
  { word: 'mustapha', category: 'name', difficulty: 1 },
  { word: 'nuhu', category: 'name', difficulty: 1 },
  { word: 'rahma', category: 'name', difficulty: 1 },
  { word: 'sadiq', category: 'name', difficulty: 1 },
  { word: 'sa\'adu', category: 'name', difficulty: 1 },
  { word: 'salisu', category: 'name', difficulty: 1 },
  { word: 'shehu', category: 'name', difficulty: 1 },
  { word: 'umar', category: 'name', difficulty: 1 },
  { word: 'yusuf', category: 'name', difficulty: 1 },
  { word: 'zahra', category: 'name', difficulty: 1 },
  { word: 'zulaihat', category: 'name', difficulty: 1 },

  // MORE IGBO NAMES
  { word: 'adaeze', category: 'name', difficulty: 1 },
  { word: 'adaobi', category: 'name', difficulty: 1 },
  { word: 'afoma', category: 'name', difficulty: 1 },
  { word: 'amarachi', category: 'name', difficulty: 1 },
  { word: 'chiamaka', category: 'name', difficulty: 1 },
  { word: 'chidimma', category: 'name', difficulty: 1 },
  { word: 'chikamso', category: 'name', difficulty: 1 },
  { word: 'chinaecherem', category: 'name', difficulty: 2 },
  { word: 'chinaza', category: 'name', difficulty: 1 },
  { word: 'chinelo', category: 'name', difficulty: 1 },
  { word: 'chinwe', category: 'name', difficulty: 1 },
  { word: 'chukwuebuka', category: 'name', difficulty: 2, aliases: ['ebuka'] },
  { word: 'chukwuemeka', category: 'name', difficulty: 2, aliases: ['emeka'] },
  { word: 'dubem', category: 'name', difficulty: 1 },
  { word: 'ebere', category: 'name', difficulty: 1 },
  { word: 'echezona', category: 'name', difficulty: 1 },
  { word: 'ejike', category: 'name', difficulty: 1 },
  { word: 'ezinne', category: 'name', difficulty: 1 },
  { word: 'ifeanyichukwu', category: 'name', difficulty: 2 },
  { word: 'ikenna', category: 'name', difficulty: 1 },
  { word: 'nkemdilim', category: 'name', difficulty: 2 },
  { word: 'nnamani', category: 'name', difficulty: 1 },
  { word: 'nnenna', category: 'name', difficulty: 1 },
  { word: 'nonso', category: 'name', difficulty: 1 },
  { word: 'nwafor', category: 'name', difficulty: 1 },
  { word: 'obiageli', category: 'name', difficulty: 1 },
  { word: 'obianuju', category: 'name', difficulty: 1 },
  { word: 'obi', category: 'name', difficulty: 1 },
  { word: 'okechukwu', category: 'name', difficulty: 1, aliases: ['okeke'] },
  { word: 'oluchi', category: 'name', difficulty: 1 },
  { word: 'onyeka', category: 'name', difficulty: 1 },
  { word: 'onyekachi', category: 'name', difficulty: 1 },
  { word: 'somto', category: 'name', difficulty: 1 },
  { word: 'uchenna', category: 'name', difficulty: 1 },
  { word: 'ugochi', category: 'name', difficulty: 1 },
  { word: 'ugonna', category: 'name', difficulty: 1 },

  // NIGERIAN PIDGIN WORDS (using 'name' category for proper nouns, 'place' for general terms)
  { word: 'omo', category: 'name', difficulty: 1 }, // Child/person
  { word: 'baba', category: 'name', difficulty: 1 }, // Father/old man
  { word: 'mama', category: 'name', difficulty: 1 }, // Mother
  { word: 'oga', category: 'name', difficulty: 1 }, // Boss/sir
  { word: 'madam', category: 'name', difficulty: 1 }, // Mrs/madam
  { word: 'chief', category: 'name', difficulty: 1 }, // Chief
  { word: 'bobo', category: 'name', difficulty: 1 }, // Guy/boy
  { word: 'babe', category: 'name', difficulty: 1 }, // Girl
  { word: 'guy', category: 'name', difficulty: 1 }, // Guy
  { word: 'bros', category: 'name', difficulty: 1 }, // Brother
  { word: 'sister', category: 'name', difficulty: 1 }, // Sister
  { word: 'uncle', category: 'name', difficulty: 1 }, // Uncle
  { word: 'aunty', category: 'name', difficulty: 1 }, // Aunty

  // NIGERIAN PLACES (additional slang names)
  { word: 'lag', category: 'city', difficulty: 1, aliases: ['lagos'] }, // Lagos slang
  { word: 'eko', category: 'city', difficulty: 1, aliases: ['lagos'] }, // Lagos native name
  { word: 'aba', category: 'city', difficulty: 1, aliases: ['made in aba'] },
  { word: 'warri', category: 'city', difficulty: 1, aliases: ['waffi'] },
  { word: 'yankee', category: 'place', difficulty: 1, aliases: ['america', 'abroad'] }, // Slang for America/abroad
  { word: 'naija', category: 'place', difficulty: 1, aliases: ['nigeria'] }, // Nigeria slang
  { word: '9ja', category: 'place', difficulty: 1, aliases: ['nigeria'] }, // Nigeria slang

  // NIGERIAN COMPANIES (additional)
  { word: 'bet9ja', category: 'company', difficulty: 1 },
  { word: 'sportybet', category: 'company', difficulty: 1 },
  { word: 'nairabet', category: 'company', difficulty: 1 },
  { word: 'betking', category: 'company', difficulty: 1 },
  { word: 'bet365', category: 'company', difficulty: 1 },
  { word: '1xbet', category: 'company', difficulty: 1 },
  { word: 'betway', category: 'company', difficulty: 1 },
  { word: 'wakanow', category: 'company', difficulty: 1 },
  { word: 'travelstart', category: 'company', difficulty: 1 },

  // NIGERIAN APPS (additional)
  { word: 'bet9ja', category: 'app', difficulty: 1 },
  { word: 'sportybet', category: 'app', difficulty: 1 },
  { word: 'nairabet', category: 'app', difficulty: 1 },
  { word: 'betking', category: 'app', difficulty: 1 },
  { word: 'vbank', category: 'app', difficulty: 1 },
  { word: 'alat', category: 'app', difficulty: 1 },
  { word: 'rubies', category: 'app', difficulty: 1 },
  { word: 'specta', category: 'app', difficulty: 1 },
];

export async function up(): Promise<void> {
  logger.info('Starting migration: Add Nigerian native words (colors, cars, food, Yoruba, Hausa, Pidgin)');

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of nigerianNativeWords) {
    try {
      const startsWith = entry.word.charAt(0).toLowerCase();

      // Check if word already exists
      const existingWord = await WordModel.findOne({
        word: entry.word,
        category: entry.category,
      });

      if (existingWord) {
        skipped++;
        logger.debug(`Word "${entry.word}" already exists, skipping`);
        continue;
      }

      // Insert new word
      await WordModel.create({
        id: generateId(16, 'WORD'),
        word: entry.word,
        category: entry.category,
        startsWith: startsWith,
        difficulty: entry.difficulty || 1,
        aliases: entry.aliases || [],
        popularity: 0,
        validationCount: 0,
        contestCount: 0,
        addedBy: 'migration',
        isUserSubmitted: false,
        isReviewed: true,
        isApproved: true,
      });

      inserted++;
      logger.debug(`Inserted word: "${entry.word}" (${entry.category})`);
    } catch (error: any) {
      errors++;
      logger.error(`Error inserting word "${entry.word}"`, error);
    }
  }

  logger.info(`Migration complete: ${inserted} inserted, ${skipped} skipped, ${errors} errors`);
  logger.info(`Summary by category:`);

  const categoryCounts: Record<string, number> = {};
  nigerianNativeWords.forEach(word => {
    categoryCounts[word.category] = (categoryCounts[word.category] || 0) + 1;
  });

  Object.entries(categoryCounts).forEach(([category, count]) => {
    logger.info(`  ${category}: ${count} words`);
  });
}

export async function down(): Promise<void> {
  logger.info('Rolling back migration: Remove Nigerian native words');

  const wordsToRemove = nigerianNativeWords.map(w => w.word);

  const result = await WordModel.deleteMany({
    word: { $in: wordsToRemove },
    addedBy: 'migration',
  });

  logger.info(`Rollback complete: ${result.deletedCount} documents deleted`);
}
