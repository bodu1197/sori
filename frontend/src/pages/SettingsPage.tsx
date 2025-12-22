import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  User,
  Bell,
  Lock,
  Moon,
  Sun,
  Globe,
  HelpCircle,
  LogOut,
  ChevronRight,
  Shield,
  Eye,
  Volume2,
  Check,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../stores/useAuthStore';

// Supported languages with native names (50 languages for global platform)
const LANGUAGES = [
  // Major Global Languages
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Espanol' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugues' },
  { code: 'fr', name: 'French', nativeName: 'Francais' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'ru', name: 'Russian', nativeName: 'Russkij' },
  { code: 'tr', name: 'Turkish', nativeName: 'Turkce' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tieng Viet' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  // Indian Subcontinent Languages
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  // European Languages
  { code: 'uk', name: 'Ukrainian', nativeName: 'Ukrainska' },
  { code: 'ro', name: 'Romanian', nativeName: 'Romana' },
  { code: 'el', name: 'Greek', nativeName: 'Ellinika' },
  { code: 'cs', name: 'Czech', nativeName: 'Cestina' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Balgarski' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'sr', name: 'Serbian', nativeName: 'Srpski' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovencina' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenscina' },
  { code: 'ca', name: 'Catalan', nativeName: 'Catala' },
  // Middle East & Africa
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  // Other Asian Languages
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာဘာသာ' },
];

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SettingItem({
  icon,
  label,
  description,
  onClick,
  rightElement,
  danger,
}: SettingItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition ${
        danger ? 'text-red-500' : 'text-black dark:text-white'
      }`}
    >
      <div className={`${danger ? 'text-red-500' : 'text-gray-500'}`}>{icon}</div>
      <div className="flex-1 text-left">
        <p className="font-medium">{label}</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      {rightElement || <ChevronRight size={20} className="text-gray-400" />}
    </button>
  );
}

interface ToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <div
        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuthStore();
  const { t, i18n } = useTranslation();

  // Settings state
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Get current language info
  const currentLanguage = LANGUAGES.find((lang) => lang.code === i18n.language) || LANGUAGES[0];

  // Handle language change
  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
    setShowLanguageModal(false);
  };

  // Handle dark mode toggle
  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkMode(enabled);
    if (enabled) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-black min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-black dark:text-white">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-semibold text-black dark:text-white">
            {t('settings.title')}
          </h1>
        </div>
      </div>

      {/* Account Section */}
      <div className="mt-4">
        <h2 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">
          {t('settings.account')}
        </h2>
        <SettingItem
          icon={<User size={22} />}
          label={t('settings.editProfile')}
          description={t('settings.editProfileDesc')}
          onClick={() => navigate('/edit-profile')}
        />
        <SettingItem
          icon={<Lock size={22} />}
          label={t('settings.password')}
          description={t('settings.passwordDesc')}
          onClick={() => {
            /* TODO: Password change modal */
          }}
        />
        <SettingItem
          icon={<Shield size={22} />}
          label={t('settings.security')}
          description={t('settings.securityDesc')}
          onClick={() => {
            /* TODO: Security settings */
          }}
        />
      </div>

      {/* Privacy Section */}
      <div className="mt-6">
        <h2 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">
          {t('settings.privacy')}
        </h2>
        <SettingItem
          icon={<Lock size={22} />}
          label={t('settings.privateAccount')}
          description={t('settings.privateAccountDesc')}
          rightElement={<Toggle enabled={privateAccount} onChange={setPrivateAccount} />}
        />
        <SettingItem
          icon={<Eye size={22} />}
          label={t('settings.activityStatus')}
          description={t('settings.activityStatusDesc')}
          rightElement={<Toggle enabled={showActivity} onChange={setShowActivity} />}
        />
      </div>

      {/* Notifications Section */}
      <div className="mt-6">
        <h2 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">
          {t('settings.notifications')}
        </h2>
        <SettingItem
          icon={<Bell size={22} />}
          label={t('settings.pushNotifications')}
          description={t('settings.pushNotificationsDesc')}
          rightElement={<Toggle enabled={pushNotifications} onChange={setPushNotifications} />}
        />
        <SettingItem
          icon={<Bell size={22} />}
          label={t('settings.emailNotifications')}
          description={t('settings.emailNotificationsDesc')}
          rightElement={<Toggle enabled={emailNotifications} onChange={setEmailNotifications} />}
        />
      </div>

      {/* Playback Section */}
      <div className="mt-6">
        <h2 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">
          {t('settings.playback')}
        </h2>
        <SettingItem
          icon={<Volume2 size={22} />}
          label={t('settings.autoplay')}
          description={t('settings.autoplayDesc')}
          rightElement={<Toggle enabled={autoPlay} onChange={setAutoPlay} />}
        />
      </div>

      {/* Appearance Section */}
      <div className="mt-6">
        <h2 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">
          {t('settings.appearance')}
        </h2>
        <SettingItem
          icon={darkMode ? <Moon size={22} /> : <Sun size={22} />}
          label={t('settings.darkMode')}
          description={darkMode ? t('settings.darkModeOn') : t('settings.darkModeOff')}
          rightElement={<Toggle enabled={darkMode} onChange={handleDarkModeToggle} />}
        />
        <SettingItem
          icon={<Globe size={22} />}
          label={t('settings.language')}
          description={currentLanguage.nativeName}
          onClick={() => setShowLanguageModal(true)}
        />
      </div>

      {/* Support Section */}
      <div className="mt-6">
        <h2 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">
          {t('settings.support')}
        </h2>
        <SettingItem
          icon={<HelpCircle size={22} />}
          label={t('settings.helpCenter')}
          onClick={() => {
            /* TODO: Help center */
          }}
        />
        <SettingItem
          icon={<Shield size={22} />}
          label={t('settings.privacyPolicy')}
          onClick={() => {
            /* TODO: Privacy policy */
          }}
        />
        <SettingItem
          icon={<Shield size={22} />}
          label={t('settings.termsOfService')}
          onClick={() => {
            /* TODO: Terms of service */
          }}
        />
      </div>

      {/* Logout Section */}
      <div className="mt-6 mb-8">
        <SettingItem
          icon={<LogOut size={22} />}
          label={t('settings.logout')}
          onClick={handleLogout}
          danger
          rightElement={<></>}
        />
      </div>

      {/* App Version */}
      <div className="px-4 py-4 text-center">
        <p className="text-sm text-gray-400">SORI v1.0.0</p>
      </div>

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 w-full sm:w-[400px] sm:rounded-xl rounded-t-xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-black dark:text-white">
                {t('settings.language')}
              </h3>
              <button
                onClick={() => setShowLanguageModal(false)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            {/* Language List */}
            <div className="flex-1 overflow-y-auto">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-black dark:text-white">
                      {lang.nativeName}
                    </span>
                    <span className="text-sm text-gray-500">{lang.name}</span>
                  </div>
                  {i18n.language === lang.code && <Check size={20} className="text-blue-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
