import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../stores/useAuthStore';

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

  // Settings state
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);

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
          <h1 className="text-lg font-semibold text-black dark:text-white">Settings</h1>
        </div>
      </div>

      {/* Account Section */}
      <div className="mt-4">
        <h2 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">Account</h2>
        <SettingItem
          icon={<User size={22} />}
          label="Edit Profile"
          description="Update your profile information"
          onClick={() => navigate('/edit-profile')}
        />
        <SettingItem
          icon={<Lock size={22} />}
          label="Password"
          description="Change your password"
          onClick={() => {
            /* TODO: Password change modal */
          }}
        />
        <SettingItem
          icon={<Shield size={22} />}
          label="Security"
          description="Two-factor authentication"
          onClick={() => {
            /* TODO: Security settings */
          }}
        />
      </div>

      {/* Privacy Section */}
      <div className="mt-6">
        <h2 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">Privacy</h2>
        <SettingItem
          icon={<Lock size={22} />}
          label="Private Account"
          description="Only followers can see your playlists"
          rightElement={<Toggle enabled={privateAccount} onChange={setPrivateAccount} />}
        />
        <SettingItem
          icon={<Eye size={22} />}
          label="Activity Status"
          description="Show when you are online"
          rightElement={<Toggle enabled={showActivity} onChange={setShowActivity} />}
        />
      </div>

      {/* Notifications Section */}
      <div className="mt-6">
        <h2 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">Notifications</h2>
        <SettingItem
          icon={<Bell size={22} />}
          label="Push Notifications"
          description="Receive push notifications"
          rightElement={<Toggle enabled={pushNotifications} onChange={setPushNotifications} />}
        />
        <SettingItem
          icon={<Bell size={22} />}
          label="Email Notifications"
          description="Receive email updates"
          rightElement={<Toggle enabled={emailNotifications} onChange={setEmailNotifications} />}
        />
      </div>

      {/* Playback Section */}
      <div className="mt-6">
        <h2 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">Playback</h2>
        <SettingItem
          icon={<Volume2 size={22} />}
          label="Autoplay"
          description="Automatically play next track"
          rightElement={<Toggle enabled={autoPlay} onChange={setAutoPlay} />}
        />
      </div>

      {/* Appearance Section */}
      <div className="mt-6">
        <h2 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">Appearance</h2>
        <SettingItem
          icon={darkMode ? <Moon size={22} /> : <Sun size={22} />}
          label="Dark Mode"
          description={darkMode ? 'Currently using dark theme' : 'Currently using light theme'}
          rightElement={<Toggle enabled={darkMode} onChange={handleDarkModeToggle} />}
        />
        <SettingItem
          icon={<Globe size={22} />}
          label="Language"
          description="English"
          onClick={() => {
            /* TODO: Language selector */
          }}
        />
      </div>

      {/* Support Section */}
      <div className="mt-6">
        <h2 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">Support</h2>
        <SettingItem
          icon={<HelpCircle size={22} />}
          label="Help Center"
          onClick={() => {
            /* TODO: Help center */
          }}
        />
        <SettingItem
          icon={<Shield size={22} />}
          label="Privacy Policy"
          onClick={() => {
            /* TODO: Privacy policy */
          }}
        />
        <SettingItem
          icon={<Shield size={22} />}
          label="Terms of Service"
          onClick={() => {
            /* TODO: Terms of service */
          }}
        />
      </div>

      {/* Logout Section */}
      <div className="mt-6 mb-8">
        <SettingItem
          icon={<LogOut size={22} />}
          label="Log Out"
          onClick={handleLogout}
          danger
          rightElement={<></>}
        />
      </div>

      {/* App Version */}
      <div className="px-4 py-4 text-center">
        <p className="text-sm text-gray-400">SORI v1.0.0</p>
      </div>
    </div>
  );
}
