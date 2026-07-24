import {createSlice} from "@reduxjs/toolkit";

const initialState = {
    user:null,
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
        }
    },
});

export const {setUser, clearUser, addApplication} = userSlice.actions;
export default userSlice.reducer;