import ProfileIcon from '../../Assets/Images/ProfileIcon.png' 
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

function ProfileButton(){
    const navigate = useNavigate();
    const user = useSelector((state)=>state.user.user);

    return(
        <img src= {ProfileIcon} alt="Profile" width="50px" onClick={()=>navigate(`/profile/${user.type}`)}/>
    )
}

export default ProfileButton;