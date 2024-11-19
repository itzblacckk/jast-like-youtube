import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Moon, Sun, Bell, Shield, User, Globe } from 'lucide-react';
import { useAuthStore } from '../store/auth';

export function Settings() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (!user) {
    navigate('/login');
    return null;
  }

  const settings = [
    {
      category: 'Account',
      icon: User,
      items: [
        { label: 'Profile', description: 'Manage your personal information' },
        { label: 'Privacy', description: 'Control who can see your content' },
        { label: 'Security', description: 'Password and authentication settings' },
      ],
    },
    {
      category: 'Preferences',
      icon: Globe,
      items: [
        { label: 'Language', description: 'Choose your preferred language' },
        { label: 'Dark Mode', description: 'Toggle dark/light theme', toggle: true, state: darkMode, onChange: setDarkMode },
        { label: 'Autoplay', description: 'Play videos automatically' },
      ],
    },
    {
      category: 'Notifications',
      icon: Bell,
      items: [
        { label: 'Email Notifications', description: 'Manage email preferences' },
        { label: 'Push Notifications', description: 'Control mobile and desktop alerts' },
        { label: 'Subscription Updates', description: 'Updates from channels you follow' },
      ],
    },
    {
      category: 'Privacy & Safety',
      icon: Shield,
      items: [
        { label: 'Privacy Settings', description: 'Control your content visibility' },
        { label: 'Blocked Users', description: 'Manage blocked accounts' },
        { label: 'Content Filters', description: 'Set content viewing preferences' },
      ],
    },
  ];

  return (
    <main className="pt-14 pl-64">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-8 h-8" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <div className="space-y-8">
          {settings.map(({ category, icon: Icon, items }) => (
            <section key={category}>
              <div className="flex items-center gap-2 mb-4">
                <Icon className="w-5 h-5" />
                <h2 className="text-lg font-semibold">{category}</h2>
              </div>
              <div className="space-y-2">
                {items.map(({ label, description, toggle, state, onChange }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div>
                      <h3 className="font-medium">{label}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                    </div>
                    {toggle ? (
                      <button
                        onClick={() => onChange?.(!state)}
                        className={`p-2 rounded-full ${
                          state ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {state ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                      </button>
                    ) : (
                      <button className="text-sm text-blue-600 hover:text-blue-700">
                        Edit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}