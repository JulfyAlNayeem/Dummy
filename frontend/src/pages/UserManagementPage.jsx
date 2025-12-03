import { useDispatch, useSelector } from "react-redux"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  selectModals,
  selectSelectedUser,
  selectSelectedSchedule,
  selectFilters,
} from "@/redux/slices/uiSlice"
import {
  useGetScheduledDeletionsQuery,
  useGetInactiveUsersQuery,
} from "@/redux/api/admin/userManagementApi"
import ScheduledDeletionsTab from "../components/admin/ScheduledDeletionsTab"
import InactiveUsersTab from "../components/admin/InactiveUsersTab"
import UserActionDialog from "../components/admin/UserActionDialog"
import AllUsersTab from "../components/admin/AllUsersTab"
import {
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
  useResetUserPasswordMutation,
  usePreventDeletionMutation,
} from "@/redux/api/admin/userManagementApi";

import { useNotifications } from "@/hooks/useNotifications"
import { openModal, closeModal } from "@/redux/slices/uiSlice"
import DashboardLayout from "../components/admin/DashboardLayout"
import toast from "react-hot-toast"

export default function UserManagementTabs() {
  const dispatch = useDispatch()
  const { showSuccess, showError } = useNotifications()
  const modals = useSelector(selectModals)
  const selectedUser = useSelector(selectSelectedUser)
  const selectedSchedule = useSelector(selectSelectedSchedule)
  const filters = useSelector(selectFilters)

  const { data: scheduledDeletionsData } = useGetScheduledDeletionsQuery()
  const { data: inactiveUsersData } = useGetInactiveUsersQuery({ months: 6 })

  const [createUser, { isLoading: isCreatingUser, error: createUserError }] = useCreateUserMutation({
    onSuccess: (data) => {
      showSuccess("User created successfully")
      dispatch(closeModal("createUser"))
    },
    onError: (error) => {
      showError(error.data?.message || "Failed to create user")
    },
  })

  const [updateUser, { isLoading: isUpdatingUser, error: updateUserError }] = useUpdateUserMutation({
    onSuccess: (data) => {
      showSuccess("User updated successfully")
      dispatch(closeModal("editUser"))
    },
    onError: (error) => {
      showError(error.data?.message || "Failed to update user")
    },
  })

  const [deleteUser, { isLoading: isDeletingUser, error: deleteUserError }] = useDeleteUserMutation({
    onSuccess: (data) => {
      showSuccess("User deleted successfully")
      dispatch(closeModal("deleteUser"))
    },
    onError: (error) => {
      showError(error.data?.message || "Failed to delete user")
    },
  })

  const [blockUser, { isLoading: isBlockingUser, error: blockUserError }] = useBlockUserMutation({
    onSuccess: (data) => {
      showSuccess("User blocked successfully")
      dispatch(closeModal("blockUser"))
    },
    onError: (error) => {
      showError(error.data?.message || "Failed to block user")
    },
  })

  const [unblockUser, { isLoading: isUnblockingUser, error: unblockUserError }] = useUnblockUserMutation({
    onSuccess: (data) => {
      showSuccess("User unblocked successfully")
      dispatch(closeModal("unblockUser"))
    },
    onError: (error) => {
      showError(error.data?.message || "Failed to unblock user")
    },
  })

  const [resetUserPassword, { isLoading: isResettingPassword, error: resetPasswordError }] = useResetUserPasswordMutation({
    onSuccess: (data) => {
      showSuccess("Password reset successfully")
      dispatch(closeModal("resetPassword"))
    },
    onError: (error) => {
      showError(error.data?.message || "Failed to reset password")
    },
  })

  const [preventDeletion, { isLoading: isPreventingDeletion, error: preventDeletionError }] = usePreventDeletionMutation({
    onSuccess: (data) => {
      showSuccess("User deletion prevented successfully")
      dispatch(closeModal("preventDeletion"))
    },
    onError: (error) => {
      showError(error.data?.message || "Failed to prevent deletion")
    },
  })

    //  Handlers with toast messages using react-hot-toast
  const handleCreateUser = async (userData) => {
    try {
      await createUser(userData).unwrap()
      toast.success("User created successfully")
      dispatch(closeModal("createUser"))
    } catch (err) {
      toast.error(err?.data?.message || "Failed to create user")
    }
  }

  const handleUpdateUser = async (userId, userData) => {
    try {
      await updateUser({ userId, ...userData }).unwrap()
      toast.success("User updated successfully")
      dispatch(closeModal("editUser"))
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update user")
    }
  }

  const handleDeleteUser = async (userId, reason) => {
    try {
      await deleteUser({ userId, reason }).unwrap()
      toast.success("User deleted successfully")
      dispatch(closeModal("deleteUser"))
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete user")
    }
  }

  const handleBlockUser = async (userId, reason, duration) => {
    try {
      await blockUser({ userId, reason, duration }).unwrap()
      toast.success("User blocked successfully")
      dispatch(closeModal("blockUser"))
    } catch (err) {
      toast.error(err?.data?.message || "Failed to block user")
    }
  }

  const handleUnblockUser = async (userId) => {
    try {
      await unblockUser({ userId }).unwrap()
      toast.success("User unblocked successfully")
      dispatch(closeModal("unblockUser"))
    } catch (err) {
      toast.error(err?.data?.message || "Failed to unblock user")
    }
  }

  const handleResetPassword = async (userId, newPassword) => {
    try {
      await resetUserPassword({ userId, newPassword }).unwrap()
      toast.success("Password reset successfully")
      dispatch(closeModal("resetPassword"))
    } catch (err) {
      toast.error(err?.data?.message || "Failed to reset password")
    }
  }

  const handlePreventDeletion = async (scheduleId, reason) => {
    try {
      await preventDeletion({ scheduleId, reason }).unwrap()
      toast.success("User deletion prevented successfully")
      dispatch(closeModal("preventDeletion"))
    } catch (err) {
      toast.error(err?.data?.message || "Failed to prevent deletion")
    }
  }


  return (
    <DashboardLayout type={"admin"}>
      <Tabs defaultValue="all-users" className="space-y-4">
        <TabsList className="bg-gradient-to-r from-gray-800 to-gray-700 dark:from-blue-200 dark:to-blue-100 border border-gray-700 dark:border-blue-300">
          <TabsTrigger
            value="all-users"
            className="text-white dark:text-gray-900 data-[state=active]:bg-gray-900 dark:data-[state=active]:bg-blue-300 data-[state=active]:text-green-400 dark:data-[state=active]:text-green-600"
          >
            All Users
          </TabsTrigger>
          <TabsTrigger
            value="scheduled-deletions"
            className="text-white dark:text-gray-900 data-[state=active]:bg-gray-900 dark:data-[state=active]:bg-blue-300 data-[state=active]:text-green-400 dark:data-[state=active]:text-green-600"
          >
            Scheduled Deletions
            {scheduledDeletionsData?.deletions?.length > 0 && (
              <Badge variant="destructive" className="ml-2 bg-red-600 dark:bg-red-500">
                {scheduledDeletionsData.deletions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="inactive-users"
            className="text-white dark:text-gray-900 data-[state=active]:bg-gray-900 dark:data-[state=active]:bg-blue-300 data-[state=active]:text-green-400 dark:data-[state=active]:text-green-600"
          >
            Inactive Users
            {inactiveUsersData?.users?.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-gray-600 dark:bg-gray-400">
                {inactiveUsersData.users.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all-users" className="space-y-4">
          <AllUsersTab />
        </TabsContent>
        <TabsContent value="scheduled-deletions" className="space-y-4">
          <ScheduledDeletionsTab />
        </TabsContent>
        <TabsContent value="inactive-users" className="space-y-4">
          <InactiveUsersTab />
        </TabsContent>

        <UserActionDialog
          onCreateUser={handleCreateUser}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          onResetPassword={handleResetPassword}
          onPreventDeletion={handlePreventDeletion}
        />
      </Tabs>
    </DashboardLayout>
  )
}