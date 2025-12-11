import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { closeModal, selectModals, selectSelectedUser, selectSelectedSchedule } from '@/redux/slices/uiSlice'

export default function UserActionDialog({
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onBlockUser,
  onUnblockUser, // Added to props destructuring
  onResetPassword,
  onPreventDeletion,
  onToggleFilePermission,
}) {
  const dispatch = useDispatch()
  const modals = useSelector(selectModals)
  const selectedUser = useSelector(selectSelectedUser)
  const selectedSchedule = useSelector(selectSelectedSchedule)

  const [formData, setFormData] = useState({})

  // Reset form data when modal opens/closes
  useEffect(() => {
    if (selectedUser) {
      setFormData(selectedUser)
    } else if (selectedSchedule) {
      setFormData(selectedSchedule)
    } else {
      setFormData({})
    }
  }, [selectedUser, selectedSchedule])

  const handleSubmit = () => {
    if (modals.createUser) {
      onCreateUser(formData)
    } else if (modals.editUser) {
      onUpdateUser(selectedUser._id, formData)
    } else if (modals.deleteUser) {
      onDeleteUser(selectedUser._id, formData.reason)
    } else if (modals.blockUser) {
      onBlockUser(selectedUser._id, formData.reason, formData.duration)
    } else if (modals.unblockUser) { // Added unblock user case
      onUnblockUser(selectedUser._id, formData.reason)
    } else if (modals.resetPassword) {
      if (!selectedUser || !selectedUser._id) {
        console.error("Reset password error: selectedUser is null or missing _id", selectedUser);
        return;
      }
      onResetPassword(selectedUser._id, formData.newPassword)
    } else if (modals.preventDeletion) {
      onPreventDeletion(selectedSchedule._id, formData.reason)
    } else if (modals.toggleFilePermission) {
      onToggleFilePermission(selectedUser._id, !selectedUser.fileSendingAllowed)
    }
  }

  const getModalConfig = () => {
    if (modals.createUser) {
      return {
        title: "Create New User",
        description: "Add a new user to the system",
        buttonText: "Create",
        buttonVariant: "default",
      }
    } else if (modals.editUser) {
      return {
        title: "Edit User",
        description: "Update user information",
        buttonText: "Update",
        buttonVariant: "default",
      }
    } else if (modals.deleteUser) {
      return {
        title: "Delete User",
        description: "Permanently delete user account",
        buttonText: "Delete",
        buttonVariant: "destructive",
      }
    } else if (modals.blockUser) {
      return {
        title: "Block User",
        description: "Block user access to the system",
        buttonText: "Block",
        buttonVariant: "destructive",
      }
    } else if (modals.unblockUser) { // Added unblock user configuration
      return {
        title: "Unblock User",
        description: "Restore user access to the system",
        buttonText: "Unblock",
        buttonVariant: "default",
      }
    } else if (modals.resetPassword) {
      return {
        title: "Reset Password",
        description: "",
        buttonText: "Reset",
        buttonVariant: "default",
      }
    } else if (modals.preventDeletion) {
      return {
        title: "Prevent Deletion",
        description: "Prevent automatic deletion of inactive user",
        buttonText: "Prevent",
        buttonVariant: "default",
      }
    } else if (modals.toggleFilePermission) {
      return {
        title: "Toggle File Sending Permission",
        description: `${selectedUser?.fileSendingAllowed ? 'Disable' : 'Enable'} file sending for ${selectedUser?.name}`,
        buttonText: selectedUser?.fileSendingAllowed ? "Disable" : "Enable",
        buttonVariant: "default",
      }
    }
    return {}
  }

  const isOpen = Object.values(modals).some(Boolean)
  const config = getModalConfig()

  // Check if submit should be disabled
  const isSubmitDisabled = () => {
    if (modals.editUser || modals.deleteUser || modals.blockUser || modals.unblockUser || modals.resetPassword) {
      return !selectedUser || !selectedUser._id;
    }
    if (modals.preventDeletion) {
      return !selectedSchedule || !selectedSchedule._id;
    }
    return false;
  };

  const handleClose = () => {
    const openModalName = Object.keys(modals).find((key) => modals[key])
    if (openModalName) {
      dispatch(closeModal(openModalName))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-gray-800 to-gray-700 dark:from-blue-100 dark:to-blue-50 border-gray-600 dark:border-blue-300">
        <DialogHeader>
          <DialogTitle className="text-white dark:text-gray-900">{config.title}</DialogTitle>
          <DialogDescription className="text-gray-300 dark:text-blue-600">{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {(modals.createUser || modals.editUser) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white dark:text-gray-900">Name</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-gray-900 dark:bg-blue-100 text-white dark:text-gray-900 border-gray-600 dark:border-blue-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white dark:text-gray-900">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-gray-900 dark:bg-blue-100 text-white dark:text-gray-900 border-gray-600 dark:border-blue-300"
                />
              </div>
              {modals.createUser && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white dark:text-gray-900">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password || ""}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-gray-900 dark:bg-blue-100 text-white dark:text-gray-900 border-gray-600 dark:border-blue-300"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-white dark:text-gray-900">Gender</Label>
                <Select
                  value={formData.gender || ""}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger className="bg-gray-900 dark:bg-blue-100 text-white dark:text-gray-900 border-gray-600 dark:border-blue-300">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 dark:bg-blue-100 text-white dark:text-gray-900 border-gray-600 dark:border-blue-300">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-white dark:text-gray-900">Role</Label>
                <Select
                  value={formData.role || "user"}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="bg-gray-900 dark:bg-blue-100 text-white dark:text-gray-900 border-gray-600 dark:border-blue-300">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 dark:bg-blue-100 text-white dark:text-gray-900 border-gray-600 dark:border-blue-300">
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fileSendingAllowed"
                  checked={formData.fileSendingAllowed || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, fileSendingAllowed: checked })}
                  className="border-gray-600 dark:border-blue-300"
                />
                <Label htmlFor="fileSendingAllowed" className="text-white dark:text-gray-900 cursor-pointer">
                  Allow file sending
                </Label>
              </div>
            </>
          )}

          {(modals.blockUser || modals.deleteUser || modals.preventDeletion || modals.unblockUser) && ( // Added unblockUser
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-white dark:text-gray-900">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason..."
                value={formData.reason || ""}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="bg-gray-900 dark:bg-blue-100 text-white dark:text-gray-900 border-gray-600 dark:border-blue-300"
              />
            </div>
          )}

          {modals.blockUser && (
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-white dark:text-gray-900">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="Leave empty for permanent"
                value={formData.duration || ""}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="bg-gray-900 dark:bg-blue-100 text-white dark:text-gray-900 border-gray-600 dark:border-blue-300"
              />
            </div>
          )}

          {modals.resetPassword && (
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-white dark:text-gray-900">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword || ""}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="bg-gray-900 dark:bg-blue-100 text-white dark:text-gray-900 border-gray-600 dark:border-blue-300"
              />
            </div>
          )}

          {modals.toggleFilePermission && (
            <div className="space-y-2">
              <p className="text-white dark:text-gray-900">
                {selectedUser?.fileSendingAllowed
                  ? `Are you sure you want to disable file sending for ${selectedUser?.name}?`
                  : `Are you sure you want to enable file sending for ${selectedUser?.name}?`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="bg-gradient-to-r from-gray-700 to-gray-600 dark:from-blue-300 dark:to-blue-200 text-white dark:text-gray-900 border-gray-600 dark:border-blue-300 hover:from-gray-600 hover:to-gray-500 dark:hover:from-blue-400 dark:hover:to-blue-300"
          >
            Cancel
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleSubmit}
            disabled={isSubmitDisabled()}
            className={
              config.buttonVariant === "destructive"
                ? "bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-400 text-white hover:from-blue-700 hover:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            }
          >
            {config.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}