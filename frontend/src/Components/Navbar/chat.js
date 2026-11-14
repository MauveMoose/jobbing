import ChatIcon from '../../Assets/Images/ChatIcon.png';
import { useSelector } from 'react-redux';

const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/11PDEYw9vrwcFPjTSjWoOY6uQXBxcB4YeulFm3mH0kGk/edit?gid=0#gid=0";

function ChatButton(){
    const user = useSelector((state) => state.user.user);
    const isRecruiter = user && (user.type === "recruiters" || user.company);

    if (isRecruiter) {
        return (
            <a 
                href={GOOGLE_SHEET_URL} 
                target="_blank" 
                rel="noopener noreferrer" 
                title="Open Placement Records Google Sheet"
                style={{ display: "inline-block" }}
            >
                <img src={ChatIcon} alt="Google Sheet Records" height="65px" style={{ cursor: "pointer" }} />
            </a>
        );
    }

    return (
        <img src={ChatIcon} alt="Chats" height="65px" />
    );
}

export default ChatButton;