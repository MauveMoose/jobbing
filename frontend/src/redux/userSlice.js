import {createSlice} from "@reduxjs/toolkit";

const savedShowMatch = localStorage.getItem("showMatchPercentage");

const initialState = {
    user: null,
    showMatchPercentage: savedShowMatch !== null ? JSON.parse(savedShowMatch) : true,
}

const userSlice = createSlice({
    name:"user",
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.user = action.payload
        },
        clearUser: (state) => {
            state.user = null;
        },
        addApplication: (state, action) => {
            if(state.user){
                if(!state.user.applications) state.user.applications = [];
                state.user.applications.push(action.payload);
            }
        },
        removeApplication: (state, action) => {
            if(state.user && state.user.applications){
                const targetId = action.payload?.toString();
                state.user.applications = state.user.applications.filter(
                    a => (a.id || a.jobId)?.toString() !== targetId
                );
            }
        },
        toggleMatchPercentage: (state) => {
            state.showMatchPercentage = !state.showMatchPercentage;
            localStorage.setItem("showMatchPercentage", JSON.stringify(state.showMatchPercentage));
        }
    },
});

export const {setUser, clearUser, addApplication, removeApplication, toggleMatchPercentage} = userSlice.actions;
export default userSlice.reducer;