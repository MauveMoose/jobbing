import ProfileButton from './profile'
import ChatButton from './chat';
import HomeButton from './jobbing';
import SearchBar from './search';
import LogoutButton from './logoutButton';

function PageHeader(){


    return(
        <div className='Navbar'>
            <div className='Left'>
                <HomeButton />
            </div>
            <div className='Right'>
                <SearchBar />
                <ChatButton />
                <ProfileButton />
                <LogoutButton />
            </div>
        </div>
    )
}

export default PageHeader;