import {
  IconScissors, IconCoffee, IconPizza, IconBurger, IconCherry,
  IconIceCream, IconCake, IconCookie, IconSoup, IconBread,
  IconFish, IconSalad, IconMeat, IconToolsKitchen2, IconGlass,
  IconBeer, IconBottle, IconLollipop, IconEgg, IconApple, IconGrape,
  IconSparkles, IconBrush, IconSpray, IconCrown,
  IconDiamond, IconSunglasses,
  IconBarbell, IconPill, IconHeartbeat,
  IconActivity, IconStethoscope, IconDental, IconRun, IconSwimming, IconBike, IconHeart,
  IconShoppingBag, IconShirt, IconHanger, IconTag, IconGift, IconClock,
  IconCar, IconSteeringWheel, IconGasStation, IconTool, IconHammer, IconTruck,
  IconBook, IconPencil, IconSchool, IconPalette, IconCamera, IconMusic,
  IconMicrophone,
  IconPaw, IconPlant, IconLeaf, IconFlower, IconSun, IconHome, IconPlane,
  IconStar, IconTrophy, IconMedal, IconBolt, IconFlame, IconRocket,
  IconConfetti, IconCurrencyDollar, IconThumbUp,
} from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'

export const STAMP_ICONS: Record<string, Icon> = {
  // Food & Drink
  coffee:         IconCoffee,
  pizza:          IconPizza,
  burger:         IconBurger,
  donut:          IconCherry,
  'ice-cream':    IconIceCream,
  cake:           IconCake,
  cookie:         IconCookie,
  soup:           IconSoup,
  bread:          IconBread,
  fish:           IconFish,
  salad:          IconSalad,
  meat:           IconMeat,
  kitchen:        IconToolsKitchen2,
  glass:          IconGlass,
  beer:           IconBeer,
  bottle:         IconBottle,
  lollipop:       IconLollipop,
  egg:            IconEgg,
  apple:          IconApple,
  grapes:         IconGrape,
  // Beauty & Style
  scissors:       IconScissors,
  sparkles:       IconSparkles,
  brush:          IconBrush,
  spray:          IconSpray,
  crown:          IconCrown,
  diamond:        IconDiamond,
  sunglasses:     IconSunglasses,
  // Health & Fitness
  barbell:        IconBarbell,
  pill:           IconPill,
  heartbeat:      IconHeartbeat,
  activity:       IconActivity,
  stethoscope:    IconStethoscope,
  tooth:          IconDental,
  run:            IconRun,
  swim:           IconSwimming,
  bike:           IconBike,
  heart:          IconHeart,
  // Retail
  'shopping-bag': IconShoppingBag,
  shirt:          IconShirt,
  hanger:         IconHanger,
  tag:            IconTag,
  gift:           IconGift,
  watch:          IconClock,
  // Auto & Trade
  car:            IconCar,
  wheel:          IconSteeringWheel,
  'gas-station':  IconGasStation,
  tool:           IconTool,
  hammer:         IconHammer,
  truck:          IconTruck,
  // Education & Arts
  book:           IconBook,
  pencil:         IconPencil,
  school:         IconSchool,
  palette:        IconPalette,
  camera:         IconCamera,
  music:          IconMusic,
  microphone:     IconMicrophone,
  // Nature & Life
  paw:            IconPaw,
  plant:          IconPlant,
  leaf:           IconLeaf,
  flower:         IconFlower,
  sun:            IconSun,
  home:           IconHome,
  plane:          IconPlane,
  // General
  star:           IconStar,
  trophy:         IconTrophy,
  medal:          IconMedal,
  bolt:           IconBolt,
  flame:          IconFlame,
  rocket:         IconRocket,
  confetti:       IconConfetti,
  dollar:         IconCurrencyDollar,
  thumbup:        IconThumbUp,
}

export const DEFAULT_ICON = 'star'

export function getStampIcon(key: string): Icon {
  return STAMP_ICONS[key] ?? IconStar
}

export const STAMP_ICON_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Food & Drink',     keys: ['coffee','pizza','burger','donut','ice-cream','cake','cookie','soup','bread','fish','salad','meat','kitchen','glass','beer','bottle','lollipop','egg','apple','grapes'] },
  { label: 'Beauty & Style',   keys: ['scissors','sparkles','brush','spray','crown','diamond','sunglasses'] },
  { label: 'Health & Fitness', keys: ['barbell','pill','heartbeat','activity','stethoscope','tooth','run','swim','bike','heart'] },
  { label: 'Retail',           keys: ['shopping-bag','shirt','hanger','tag','gift','watch'] },
  { label: 'Auto & Trade',     keys: ['car','wheel','gas-station','tool','hammer','truck'] },
  { label: 'Education & Arts', keys: ['book','pencil','school','palette','camera','music','microphone'] },
  { label: 'Nature & Life',    keys: ['paw','plant','leaf','flower','sun','home','plane'] },
  { label: 'General',          keys: ['star','trophy','medal','bolt','flame','rocket','confetti','dollar','thumbup'] },
]
