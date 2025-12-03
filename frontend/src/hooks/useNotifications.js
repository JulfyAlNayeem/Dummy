import { useDispatch, useSelector } from "react-redux"
import { addNotification, removeNotification, clearNotifications, selectNotifications } from "@/redux/slices/uiSlice"

/**
 * Custom hook for managing notifications
 */
export const useNotifications = () => {
  const dispatch = useDispatch()
  const notifications = useSelector(selectNotifications)

  const showNotification = (notification) => {
    dispatch(addNotification(notification))

    // Auto-remove notification after 5 seconds for success/info types
    if (notification.type === "success" || notification.type === "info") {
      setTimeout(() => {
        dispatch(removeNotification(notification.id || Date.now()))
      }, 5000)
    }
  }

  const showSuccess = (message, title = "Success") => {
    showNotification({
      type: "success",
      title,
      message,
    })
  }

  const showError = (message, title = "Error") => {
    showNotification({
      type: "error",
      title,
      message,
    })
  }

  const showWarning = (message, title = "Warning") => {
    showNotification({
      type: "warning",
      title,
      message,
    })
  }

  const showInfo = (message, title = "Info") => {
    showNotification({
      type: "info",
      title,
      message,
    })
  }

  const removeNotificationById = (id) => {
    dispatch(removeNotification(id))
  }

  const clearAll = () => {
    dispatch(clearNotifications())
  }

  return {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification: removeNotificationById,
    clearNotifications: clearAll,
  }
}
