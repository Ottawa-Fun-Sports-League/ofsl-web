import { Bell } from 'lucide-react';
import { NotificationPreferences as NotificationPreferencesType } from './types';

interface NotificationPreferencesProps {
  notifications: NotificationPreferencesType;
  onNotificationToggle: (key: keyof NotificationPreferencesType) => void;
  saving?: boolean;
}

export function NotificationPreferences({
  notifications,
  onNotificationToggle,
  saving = false
}: NotificationPreferencesProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="h-5 w-5 text-[#6F6F6F]" />
        <h2 className="text-xl font-bold text-[#6F6F6F]">Notification Preferences</h2>
        {saving && (
          <div className="ml-auto flex items-center gap-2 text-sm text-[#6F6F6F]">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#B20000]"></div>
            Saving...
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium text-[#6F6F6F]">Email Notifications</h3>
            <p className="text-sm text-[#6F6F6F]">Receive general updates via email</p>
          </div>
          <label className={`relative inline-flex items-center ${saving ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={notifications.emailNotifications}
              onChange={() => !saving && onNotificationToggle('emailNotifications')}
              disabled={saving}
              className="sr-only peer"
            />
            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B20000] ${saving ? 'opacity-50' : ''}`}></div>
          </label>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium text-[#6F6F6F]">Game Reminders</h3>
            <p className="text-sm text-[#6F6F6F]">Get notified before upcoming games</p>
          </div>
          <label className={`relative inline-flex items-center ${saving ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={notifications.gameReminders}
              onChange={() => !saving && onNotificationToggle('gameReminders')}
              disabled={saving}
              className="sr-only peer"
            />
            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B20000] ${saving ? 'opacity-50' : ''}`}></div>
          </label>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium text-[#6F6F6F]">League Updates</h3>
            <p className="text-sm text-[#6F6F6F]">Stay informed about league news and changes</p>
          </div>
          <label className={`relative inline-flex items-center ${saving ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={notifications.leagueUpdates}
              onChange={() => !saving && onNotificationToggle('leagueUpdates')}
              disabled={saving}
              className="sr-only peer"
            />
            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B20000] ${saving ? 'opacity-50' : ''}`}></div>
          </label>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium text-[#6F6F6F]">Payment Reminders</h3>
            <p className="text-sm text-[#6F6F6F]">Receive reminders for upcoming payments</p>
          </div>
          <label className={`relative inline-flex items-center ${saving ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={notifications.paymentReminders}
              onChange={() => !saving && onNotificationToggle('paymentReminders')}
              disabled={saving}
              className="sr-only peer"
            />
            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B20000] ${saving ? 'opacity-50' : ''}`}></div>
          </label>
        </div>
      </div>
    </div>
  );
}