
import './App.css';
import RegistrationOptions from './Components/StartPage/registrationOptions';
import ResumeUpload from './Components/StartPage/resumeUpload';
import ApplicantOptions from './Components/StartPage/applicantOptions';
import ProfilePage from './Components/BasePage/profilePage';
import JobPage from './Components/JobPage/jobPage';
import ViewUser from './Components/ViewApplicant/viewUser';
import StartPage from './Components/StartPage/startPage';
import RegistrationPage from './Components/Registration/registration';
import LoginPage from './Components/Login/loginPage';
import ProfilePageRecruiter from './Components/BasePage/profilePageRecruiter';
import {BrowserRouter as Router, Routes, Route} from "react-router-dom";
import RegistrationPageRecruiter from './Components/Registration/registrationPageRedcruiter';
import AddJob from './Components/JobPage/addJob';
import WelcomePageApplicant from './Components/WelcomePage/welcomePageApplicant';
import WelcomePageRecruiter from './Components/WelcomePage/welcomePageRecruiter';
import ResetPasswordPage from './Components/Login/resetPasswordPage';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<StartPage/>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/register" element={<RegistrationOptions />} />
          <Route path="/register/options" element={<ApplicantOptions />} />
          <Route path="/resumeupload" element={<ResumeUpload />} />
          <Route path="/register/applicant" element={<RegistrationPage />} />
          <Route path="/register/recruiter" element={<RegistrationPageRecruiter/>} />
          <Route path="/profile/applicants" element={<ProfilePage />} />
          <Route path="/profile/recruiters" element={<ProfilePageRecruiter />} />
          <Route path="/addjob" element={<AddJob />} />
          <Route path="/job/:id" element={<JobPage />} />
          <Route path="/applicants/:id" element={<ViewUser />} />
          <Route path="/welcome/applicants" element={<WelcomePageApplicant/>} />
          <Route path="/welcome/recruiters" element={<WelcomePageRecruiter/>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
