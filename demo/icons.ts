import { rocketOutline, heart, homeOutline } from 'ionicons/icons';
import { faRocket, faHouse } from '@fortawesome/free-solid-svg-icons';
import { faHeart } from '@fortawesome/free-regular-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { Camera, Search } from 'lucide';
import {
  registerIcon,
  registerIconSet,
  registerFontAwesomeIcon,
  registerLucideIcon,
} from '../src/icons';
import { iconSubsets } from './icon-subsets';
registerIcon('ion:rocket', rocketOutline);
registerIcon('ion:heart', heart);
registerIcon('ion:home', homeOutline);
registerFontAwesomeIcon('fa:rocket', faRocket);
registerFontAwesomeIcon('fa:house', faHouse);
registerFontAwesomeIcon('fa:heart', faHeart);
registerFontAwesomeIcon('fa:github', faGithub);
registerLucideIcon('lucide:camera', Camera);
registerLucideIcon('lucide:search', Search);
for (const set of Object.values(iconSubsets)) registerIconSet(set);
export const providerExamples = [
  { name: 'ion:rocket', provider: 'Ionicons' },
  { name: 'fa:rocket', provider: 'Font Awesome Free' },
  { name: 'lucide:camera', provider: 'Lucide' },
  { name: 'bi:house', provider: 'Bootstrap Icons' },
  { name: 'tabler:terminal-2', provider: 'Tabler' },
  { name: 'heroicons:home', provider: 'Heroicons' },
  { name: 'material-symbols:home', provider: 'Material Symbols' },
];
