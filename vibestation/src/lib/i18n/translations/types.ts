// Translation type definitions - allows any string value for translations

export interface CommonTranslations {
  loading: string;
  error: string;
  retry: string;
  cancel: string;
  save: string;
  delete: string;
  edit: string;
  create: string;
  search: string;
  filter: string;
  sort: string;
  all: string;
  none: string;
  yes: string;
  no: string;
  ok: string;
  close: string;
  back: string;
  next: string;
  previous: string;
  submit: string;
  confirm: string;
  welcome: string;
  logout: string;
  login: string;
  signup: string;
  settings: string;
  profile: string;
  home: string;
  more: string;
  less: string;
  seeAll: string;
  viewMore: string;
}

export interface NavTranslations {
  home: string;
  explore: string;
  library: string;
  search: string;
  shop: string;
  notifications: string;
  messages: string;
  profile: string;
  settings: string;
  admin: string;
  creator: string;
}

export interface AuthTranslations {
  login: string;
  signup: string;
  logout: string;
  email: string;
  password: string;
  confirmPassword: string;
  forgotPassword: string;
  resetPassword: string;
  sendResetLink: string;
  newPassword: string;
  currentPassword: string;
  rememberMe: string;
  orContinueWith: string;
  noAccount: string;
  haveAccount: string;
  createAccount: string;
  signInWith: string;
  verifyEmail: string;
  checkEmail: string;
  emailVerified: string;
  invalidCredentials: string;
  accountExists: string;
  weakPassword: string;
  passwordMismatch: string;
}

export interface ProfileTranslations {
  editProfile: string;
  followers: string;
  following: string;
  posts: string;
  likes: string;
  playlists: string;
  bio: string;
  website: string;
  location: string;
  joinedOn: string;
  follow: string;
  unfollow: string;
  block: string;
  report: string;
  share: string;
  displayName: string;
  username: string;
  changeAvatar: string;
  changeBanner: string;
}

export interface FeedTranslations {
  createPost: string;
  whatsOnYourMind: string;
  addPhoto: string;
  addMusic: string;
  addPoll: string;
  post: string;
  like: string;
  comment: string;
  share: string;
  repost: string;
  comments: string;
  writeComment: string;
  viewAllComments: string;
  noComments: string;
  beFirst: string;
  delete: string;
  edit: string;
  report: string;
  hide: string;
  sponsored: string;
  pinned: string;
  emptyFeed: string;
  followSuggestion: string;
}

export interface MusicTranslations {
  play: string;
  pause: string;
  next: string;
  previous: string;
  shuffle: string;
  repeat: string;
  repeatOne: string;
  volume: string;
  mute: string;
  unmute: string;
  queue: string;
  nowPlaying: string;
  lyrics: string;
  addToPlaylist: string;
  addToQueue: string;
  removeFromQueue: string;
  createPlaylist: string;
  playlistName: string;
  playlistDescription: string;
  publicPlaylist: string;
  privatePlaylist: string;
  collaborativePlaylist: string;
  song: string;
  songs: string;
  album: string;
  albums: string;
  artist: string;
  artists: string;
  genre: string;
  genres: string;
  duration: string;
  releaseDate: string;
  explicitContent: string;
  download: string;
  downloaded: string;
  offlineMode: string;
  quality: string;
  highQuality: string;
  normalQuality: string;
  dataSaver: string;
}

export interface SearchTranslations {
  searchPlaceholder: string;
  recentSearches: string;
  clearRecent: string;
  trending: string;
  topResults: string;
  noResults: string;
  tryDifferent: string;
  suggestions: string;
}

export interface ShopTranslations {
  shop: string;
  cart: string;
  checkout: string;
  addToCart: string;
  removeFromCart: string;
  continueShopping: string;
  proceedToCheckout: string;
  emptyCart: string;
  subtotal: string;
  shipping: string;
  tax: string;
  total: string;
  freeShipping: string;
  outOfStock: string;
  inStock: string;
  quantity: string;
  price: string;
  sale: string;
  featured: string;
  newArrivals: string;
  bestSellers: string;
  physical: string;
  digital: string;
  tickets: string;
  subscriptions: string;
  orderPlaced: string;
  orderHistory: string;
  trackOrder: string;
  shippingAddress: string;
  paymentMethod: string;
}

export interface CreatorTranslations {
  dashboard: string;
  earnings: string;
  analytics: string;
  tier: string;
  bronze: string;
  silver: string;
  gold: string;
  platinum: string;
  diamond: string;
  totalEarnings: string;
  pendingPayout: string;
  availableBalance: string;
  requestPayout: string;
  payoutHistory: string;
  revenueShare: string;
  subscribers: string;
  views: string;
  engagement: string;
  monetization: string;
  tips: string;
  subscriptions: string;
  adRevenue: string;
}

export interface NotificationsTranslations {
  notifications: string;
  markAllRead: string;
  noNotifications: string;
  newFollower: string;
  liked: string;
  commented: string;
  mentioned: string;
  reposted: string;
  newPost: string;
}

export interface SettingsTranslations {
  settings: string;
  account: string;
  privacy: string;
  notifications: string;
  appearance: string;
  language: string;
  theme: string;
  darkMode: string;
  lightMode: string;
  systemTheme: string;
  autoplay: string;
  dataUsage: string;
  storage: string;
  clearCache: string;
  about: string;
  help: string;
  feedback: string;
  termsOfService: string;
  privacyPolicy: string;
  deleteAccount: string;
  deactivateAccount: string;
}

export interface TimeTranslations {
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
  weeksAgo: string;
  monthsAgo: string;
  yearsAgo: string;
  today: string;
  yesterday: string;
}

export interface ErrorTranslations {
  general: string;
  network: string;
  notFound: string;
  unauthorized: string;
  forbidden: string;
  serverError: string;
  validation: string;
  uploadFailed: string;
  tooLarge: string;
  invalidFormat: string;
}

export interface SuccessTranslations {
  saved: string;
  deleted: string;
  updated: string;
  posted: string;
  sent: string;
  copied: string;
}

export interface Translations {
  common: CommonTranslations;
  nav: NavTranslations;
  auth: AuthTranslations;
  profile: ProfileTranslations;
  feed: FeedTranslations;
  music: MusicTranslations;
  search: SearchTranslations;
  shop: ShopTranslations;
  creator: CreatorTranslations;
  notifications: NotificationsTranslations;
  settings: SettingsTranslations;
  time: TimeTranslations;
  errors: ErrorTranslations;
  success: SuccessTranslations;
}
