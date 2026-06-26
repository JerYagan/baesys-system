// src/api/auth.js
// Auth API helper functions using Supabase
import { supabase } from './supabaseClient'

/**
 * Login with email and password using Supabase Auth
 * @returns {{ success, token, user }}
 */
export const login = async (email, password) => {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (authError) {
    throw authError
  }

  // Retrieve user record from the custom 'users' table in Supabase
  const { data: dbUser, error: dbUserError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (dbUserError) {
    console.error('Failed to fetch user from DB:', dbUserError)
  }

  return {
    success: true,
    token: authData.session?.access_token,
    user: {
      id: dbUser?.id || authData.user?.id,
      email: authData.user?.email,
      first_name: dbUser?.first_name || authData.user?.user_metadata?.first_name || 'Resident',
      last_name: dbUser?.last_name || authData.user?.user_metadata?.last_name || 'User',
      role: dbUser?.role || 'resident',
      status: dbUser?.status || 'active',
    }
  }
}

/**
 * Register a new resident account using Supabase Auth and Database
 * @returns {{ success, message }}
 */
export const register = async (data) => {
  // Sign up user using Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        role: 'resident'
      }
    }
  })

  if (authError) {
    throw authError
  }

  // Insert user into custom users table
  const { data: newUser, error: userInsertError } = await supabase
    .from('users')
    .insert({
      email: data.email,
      password_hash: 'managed_by_supabase_auth',
      first_name: data.first_name,
      last_name: data.last_name,
      role: 'resident',
      status: 'active'
    })
    .select()
    .single()

  if (userInsertError) {
    throw userInsertError
  }

  // Insert into residents table
  const { error: residentInsertError } = await supabase
    .from('residents')
    .insert({
      user_id: newUser.id,
      first_name: data.first_name,
      last_name: data.last_name,
      middle_name: data.middle_name || null,
      birthdate: data.birthdate,
      sex: data.sex,
      civil_status: data.civil_status,
      contact_no: data.contact_no || null,
      purok: data.purok,
      address: data.address,
      profile_path: data.profile_path || null,
    })

  if (residentInsertError) {
    throw residentInsertError
  }

  return {
    success: true,
    message: 'Registration successful! You can now log in.'
  }
}

/**
 * Logout the current user using Supabase Auth
 * @returns {{ success, message }}
 */
export const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error

  return {
    success: true,
    message: 'Logged out successfully.'
  }
}

/**
 * Get the current authenticated user's data
 * @returns {{ success, user, resident }}
 */
export const getMe = async () => {
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  if (authError || !authUser) {
    throw authError || new Error('No active session')
  }

  const { data: dbUser, error: dbUserError } = await supabase
    .from('users')
    .select('*')
    .eq('email', authUser.email)
    .single()

  if (dbUserError) {
    throw dbUserError
  }

  let resident = null
  if (dbUser.role === 'resident') {
    const { data: resData, error: resError } = await supabase
      .from('residents')
      .select('*')
      .eq('user_id', dbUser.id)
      .single()
    if (!resError) {
      resident = resData
    }
  }

  return {
    success: true,
    user: dbUser,
    resident
  }
}

