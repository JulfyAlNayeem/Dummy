import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useGetAdminSettingsQuery, useUpdateAdminSettingsMutation } from "@/redux/api/admin/settingsApi"
import { useNotifications } from "@/hooks/useNotifications"
import DashboardLayout from "../components/admin/DashboardLayout"
import { RefreshCw } from "lucide-react"
import SiteSecurityMessages from "@/components/admin/SiteSecurityMessages"

export default function SystemSettings() {
  const { showSuccess, showError } = useNotifications()
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useGetAdminSettingsQuery()
  const [updateSettings] = useUpdateAdminSettingsMutation()

  const handleUpdateSettings = async (newSettings) => {
    try {
      await updateSettings(newSettings).unwrap()
      showSuccess("Settings updated successfully")
    } catch (error) {
      showError(error.data?.message || "Failed to update settings")
    }
  }



  return (
    <DashboardLayout type={"admin"}>
      {settingsLoading ? (
        <div className="flex items-center justify-center  min-h-svh w-full bg-gradient-to-b from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200">
          <RefreshCw className="h-8 w-8 animate-spin text-white dark:text-gray-800" />
        </div>
      ): <div className="space-y-4">
        {settingsError && (
          <div className="bg-red-900/50 dark:bg-red-100/50 border border-red-700 dark:border-red-300 text-red-200 dark:text-red-800 px-4 py-3 rounded">
            Error loading settings: {settingsError.data?.message || settingsError.message}
          </div>
        )}

        {settings && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-700 dark:from-gray-200 dark:to-gray-100 border-gray-700 dark:border-gray-300">
              <CardHeader>
                <CardTitle className="text-white dark:text-gray-900">Feature Controls</CardTitle>
                <CardDescription className="text-gray-300 dark:text-gray-600">
                  Enable or disable chat features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(settings.features).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key} className="capitalize text-white dark:text-gray-900">
                      {key.replace(/_/g, " ")}
                    </Label>
                    <Switch
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) => {
                        handleUpdateSettings({
                          features: { ...settings.features, [key]: checked },
                        })
                      }}
                      className="bg-gray-600 dark:bg-gray-300"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
            <SiteSecurityMessages/>
            <Card className="bg-gradient-to-br from-gray-800 to-gray-700 dark:from-gray-200 dark:to-gray-100 border-gray-700 dark:border-gray-300">
              <CardHeader>
                <CardTitle className="text-white dark:text-gray-900">Security Settings</CardTitle>
                <CardDescription className="text-gray-300 dark:text-gray-600">
                  Configure security and approval settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="require_admin_approval" className="text-white dark:text-gray-900">
                    Require Admin Approval
                  </Label>
                  <Switch
                    id="require_admin_approval"
                    checked={settings.security.require_admin_approval}
                    onCheckedChange={(checked) => {
                      handleUpdateSettings({
                        security: { ...settings.security, require_admin_approval: checked },
                      })
                    }}
                    className="bg-gray-600 dark:bg-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_file_size" className="text-white dark:text-gray-900">Max File Size (MB)</Label>
                  <Input
                    id="max_file_size"
                    type="number"
                    value={settings.security.max_file_size_mb}
                    onChange={(e) => {
                      handleUpdateSettings({
                        security: { ...settings.security, max_file_size_mb: Number.parseInt(e.target.value) },
                      })
                    }}
                    className="bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-600 dark:border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session_timeout" className="text-white dark:text-gray-900">Session Timeout (minutes)</Label>
                  <Input
                    id="session_timeout"
                    type="number"
                    value={settings.security.session_timeout_minutes}
                    onChange={(e) => {
                      handleUpdateSettings({
                        security: { ...settings.security, session_timeout_minutes: Number.parseInt(e.target.value) },
                      })
                    }}
                    className="bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-600 dark:border-gray-300"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>}

    </DashboardLayout>
  )
}