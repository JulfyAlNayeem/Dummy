import { defaultProfileImage } from "@/constant";

const ProfileAvatar = ({
  isOwnMessage,
  sender,
  currentUser,
  setActiveMessageId,
  message,
  setIsStatusVisible,
}) => {
  const userToDisplay = isOwnMessage ? currentUser : sender;

  const handleClick = () => {
    setActiveMessageId();         
    setIsStatusVisible(false); 
  };

  return (
    <div
      className={`${
        isOwnMessage ? "rounded-t-md rounded-l-md" : "rounded-b-md rounded-r-md"
      } bg-gradient-to-r from-blue-500 to-purple-500 cursor-pointer min-w-6 max-h-6 overflow-hidden avatar-container`}
      onClick={handleClick}
    >
      <img
        src={userToDisplay?.image || defaultProfileImage}
        alt={userToDisplay?.name || 'Participant'}
        className="size-6"
      />
    </div>
  );
};
export default ProfileAvatar;