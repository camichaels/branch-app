'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [currentSerial, setCurrentSerial] = useState('')
  const [prompts, setPrompts] = useState<{[key: string]: string}>({})
  const [connections, setConnections] = useState<any[]>([])
  const [filteredConnections, setFilteredConnections] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('connections')
  const [connectionsSortBy, setConnectionsSortBy] = useState('name')
  const [promptStats, setPromptStats] = useState<any[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [profileEditData, setProfileEditData] = useState({
    name: '',
    handle: '',
    email: '',
    phone: '',
    bio: ''
  })
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    social: '',
    location: '',
    notes: ''
  })
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [connectionToDelete, setConnectionToDelete] = useState<any>(null)
  const [userToDelete, setUserToDelete] = useState<any>(null)
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false)
  const [isCreatingNewUser, setIsCreatingNewUser] = useState(false)
  const [isEditingConnection, setIsEditingConnection] = useState(false)
  const [editingConnection, setEditingConnection] = useState<any>(null)
  const [editConnectionData, setEditConnectionData] = useState({
    name: '',
    phone: '',
    email: '',
    social: '',
    location: '',
    notes: ''
  })
  const [editConnectionLocationSuggestions, setEditConnectionLocationSuggestions] = useState<any[]>([])
  const [showEditConnectionLocationSuggestions, setShowEditConnectionLocationSuggestions] = useState(false)
  const [isGettingEditConnectionLocation, setIsGettingEditConnectionLocation] = useState(false)
  const [editConnectionPhoto, setEditConnectionPhoto] = useState<File | null>(null)
  const [editConnectionPhotoPreview, setEditConnectionPhotoPreview] = useState<string | null>(null)
  const [isUploadingEditConnectionPhoto, setIsUploadingEditConnectionPhoto] = useState(false)
  const [newUserData, setNewUserData] = useState({
    name: '',
    handle: '',
    email: '',
    phone: '',
    bio: '',
    avatar_color: 'from-green-500 to-green-600'
  })
  const [allPrompts, setAllPrompts] = useState<any[]>([])
  const [isCreatingNewPrompt, setIsCreatingNewPrompt] = useState(false)
  const [newPromptText, setNewPromptText] = useState('')

  // Input validation functions
  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '')
    return cleaned.length === 10
  }

  useEffect(() => {
    initializeApp()
  }, [])

  useEffect(() => {
    if (currentScreen === 'my-grove' && currentUser) {
      // Always start on connections tab when entering My Grove from outside
      if (activeTab !== 'connections' && !isEditingProfile) {
        setActiveTab('connections')
      }
      setSearchQuery('')
      loadConnections()
      loadPromptStats()
      // Scroll to top when entering My Grove
      setTimeout(() => scrollToTop(), 100)
    } else if (currentScreen === 'user-picker') {
      loadAvailableUsers()
    }
  }, [currentScreen, currentUser])

  useEffect(() => {
    if (activeTab === 'connections') {
      setSearchQuery('')
    }
  }, [activeTab])

  useEffect(() => {
    let connectionsToFilter = [...connections]
    
    // Apply search filter
    if (searchQuery !== '') {
      connectionsToFilter = connectionsToFilter.filter(conn =>
        conn.connectee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conn.location_name && conn.location_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (conn.notes && conn.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        conn.prompt_text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    // Apply sorting
    if (connectionsSortBy === 'name') {
      connectionsToFilter.sort((a, b) => a.connectee_name.localeCompare(b.connectee_name))
    } else if (connectionsSortBy === 'date') {
      connectionsToFilter.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    
    setFilteredConnections(connectionsToFilter)
  }, [searchQuery, connections, connectionsSortBy])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.location-input-container')) {
        setShowLocationSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initializeApp = async () => {
    await loadAvailableUsers()
    loadPrompts()
    setIsMobileDevice(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
  }

  const loadAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name')

      if (error) throw error

      setAvailableUsers(data || [])

      const savedUserId = localStorage.getItem('branch_current_user')
      if (savedUserId && data) {
        const user = data.find(u => u.id === savedUserId)
        if (user) {
          setCurrentUser(user)
          setProfileEditData({
            name: user.name || '',
            handle: user.handle || '',
            email: user.email || '',
            phone: user.phone || '',
            bio: user.bio || ''
          })
        }
      }
    } catch (error) {
      console.error('Error loading users:', error)
      setAvailableUsers([])
    }
  }

  const selectUser = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId)
    if (user) {
      setCurrentUser(user)
      localStorage.setItem('branch_current_user', userId)
      setProfileEditData({
        name: user.name || '',
        handle: user.handle || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || ''
      })
      
      setTimeout(() => {
        setCurrentScreen('welcome')
      }, 500)
    }
  }

  const clearLocationData = () => {
    setFormData({...formData, location: ''})
    setLocationSuggestions([])
    setShowLocationSuggestions(false)
  }

  const startCapture = () => {
    if (!currentUser) {
      setCurrentScreen('user-required')
      return
    }
    // Clear any previous location data
    clearLocationData()
    setCurrentScreen('capture-serial')
  }

  const loadAllPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('active', true)
        .order('prompt_text')
      
      if (error) throw error
      
      setAllPrompts(data || [])
    } catch (error) {
      console.error('Error loading all prompts:', error)
      setAllPrompts([])
    }
  }

  const createNewPrompt = async () => {
    if (!newPromptText.trim()) {
      alert('Please enter a prompt')
      return
    }

    try {
      // Get the highest existing prompt_id number
      const { data: existingPrompts, error: fetchError } = await supabase
        .from('prompts')
        .select('prompt_id')
        .order('prompt_id', { ascending: false })
        .limit(1)

      if (fetchError) throw fetchError

      // Generate next sequential number
      let nextId = 1
      if (existingPrompts && existingPrompts.length > 0) {
        const highestId = parseInt(existingPrompts[0].prompt_id)
        nextId = highestId + 1
      }

      const newPromptId = nextId.toString().padStart(3, '0') // Format as 001, 002, etc.

      // Insert new prompt
      const { data, error } = await supabase
        .from('prompts')
        .insert([{
          prompt_id: newPromptId,
          prompt_text: newPromptText.trim(),
          active: true
        }])
        .select()
        .single()

      if (error) throw error

      // Update prompts objects
      setPrompts({...prompts, [newPromptId]: newPromptText.trim()})
      
      // Reload and re-alphabetize all prompts
      await loadAllPrompts()
      
      setNewPromptText('')
      setIsCreatingNewPrompt(false)
      alert('New prompt created successfully!')
    } catch (error) {
      console.error('Error creating prompt:', error)
      alert('Error creating prompt. Please try again.')
    }
  }

  const loadPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('prompt_id, prompt_text')
        .eq('active', true)
      
      if (error) throw error
      
      const promptsObj: {[key: string]: string} = {}
      data?.forEach(prompt => {
        promptsObj[prompt.prompt_id] = prompt.prompt_text
      })
      
      setPrompts(promptsObj)
    } catch (error) {
      console.error('Error loading prompts:', error)
      setPrompts({
        "001": "What's your favorite weather forecast?",
        "002": "Where do you go to just be yourself?", 
        "003": "If you can have only one song on a desert island, what would it be?",
        "004": "What's your dream travel getaway?"
      })
    }
  }

  const loadConnections = async () => {
    if (!currentUser) return
    
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setConnections(data || [])
      setFilteredConnections(data || [])
    } catch (error) {
      console.error('Error loading connections:', error)
      alert('Error loading connections. Please try again.')
    }
  }

  const loadPromptStats = async () => {
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('prompt_text, location_name, card_serial, created_at')
      
      if (error) throw error
      
      const promptGroups: {[key: string]: any[]} = {}
      data?.forEach(conn => {
        if (!promptGroups[conn.prompt_text]) {
          promptGroups[conn.prompt_text] = []
        }
        promptGroups[conn.prompt_text].push(conn)
      })

      const stats = Object.entries(promptGroups).map(([prompt, connections]) => {
        const locations = [...new Set(connections.map(c => c.location_name).filter(Boolean))]
        const cards = [...new Set(connections.map(c => c.card_serial))]
        
        return {
          prompt_text: prompt,
          connection_count: connections.length,
          unique_locations: locations.length,
          unique_cards: cards.length,
          recent_locations: locations.slice(0, 3),
          sample_connections: connections.slice(0, 5)
        }
      }).sort((a, b) => b.connection_count - a.connection_count)

      setPromptStats(stats)
    } catch (error) {
      console.error('Error loading prompt stats:', error)
    }
  }

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([])
      setShowLocationSuggestions(false)
      return
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}&addressdetails=1`
      )
      
      if (!response.ok) throw new Error('Search failed')
      
      const data = await response.json()
      
      const suggestions = data.map((item: any) => ({
        display_name: item.display_name,
        formatted: formatAddress(item),
        lat: item.lat,
        lon: item.lon,
        place_id: item.place_id
      }))
      
      setLocationSuggestions(suggestions)
      setShowLocationSuggestions(suggestions.length > 0)
    } catch (error) {
      console.error('Error searching locations:', error)
      setLocationSuggestions([])
      setShowLocationSuggestions(false)
    }
  }

  const formatAddress = (item: any) => {
    const address = item.address || {}
    const parts = []
    
    if (address.shop || address.amenity || address.name) {
      parts.push(address.shop || address.amenity || address.name)
    }
    if (address.house_number && address.road) {
      parts.push(`${address.house_number} ${address.road}`)
    } else if (address.road) {
      parts.push(address.road)
    }
    if (address.neighbourhood || address.suburb) {
      parts.push(address.neighbourhood || address.suburb)
    }
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village)
    }
    if (address.state) {
      parts.push(address.state)
    }
    
    return parts.slice(0, 3).join(', ') || item.display_name
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser')
      return
    }

    setIsGettingLocation(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          )
          
          if (!response.ok) throw new Error('Reverse geocoding failed')
          
          const data = await response.json()
          const formattedAddress = formatAddress(data)
          
          setFormData({...formData, location: formattedAddress})
          setShowLocationSuggestions(false)
        } catch (error) {
          console.error('Error getting location:', error)
          alert('Error getting your location. Please enter manually.')
        } finally {
          setIsGettingLocation(false)
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        setIsGettingLocation(false)
        
        let message = 'Error getting location: '
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access was denied. Please enable location permissions in your browser settings and try again.'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is currently unavailable. Please enter your location manually.'
            break
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again or enter manually.'
            break
          default:
            message = 'Unable to get your location. Please enter it manually.'
        }
        alert(message)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  const selectLocation = (suggestion: any) => {
    setFormData({...formData, location: suggestion.formatted})
    setLocationSuggestions([])
    setShowLocationSuggestions(false)
  }

  const handleLocationInputChange = (value: string) => {
    setFormData({...formData, location: value})
    if (value.trim()) {
      const timeoutId = setTimeout(() => {
        searchLocations(value)
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setLocationSuggestions([])
      setShowLocationSuggestions(false)
    }
  }

  const deleteConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId)

      if (error) throw error

      setConnections(connections.filter(conn => conn.id !== connectionId))
      setFilteredConnections(filteredConnections.filter(conn => conn.id !== connectionId))
      setConnectionToDelete(null)
      
      alert('Connection deleted successfully!')
    } catch (error) {
      console.error('Error deleting connection:', error)
      alert('Error deleting connection. Please try again.')
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      const { error: connectionsError } = await supabase
        .from('connections')
        .delete()
        .eq('user_id', userId)

      if (connectionsError) throw connectionsError

      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (userError) throw userError

      if (currentUser && currentUser.id === userId) {
        setCurrentUser(null)
        localStorage.removeItem('branch_current_user')
      }

      await loadAvailableUsers()
      setUserToDelete(null)
      setShowDeleteUserConfirm(false)
      setCurrentScreen('user-picker')
      
      alert('User and all their connections deleted successfully!')
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error deleting user. Please try again.')
    }
  }

  const createNewUser = async () => {
    if (!newUserData.name.trim()) {
      alert('Please enter a name for the new user')
      return
    }

    // Validate inputs
    if (newUserData.email && !validateEmail(newUserData.email)) {
      alert('Please enter a valid email address')
      return
    }

    if (newUserData.phone && !validatePhoneNumber(newUserData.phone)) {
      alert('Please enter a valid 10-digit phone number')
      return
    }

    try {
      const formattedPhone = newUserData.phone ? formatPhoneNumber(newUserData.phone) : null
      
      const { data, error } = await supabase
        .from('users')
        .insert([{
          name: newUserData.name,
          phone: formattedPhone,
          email: newUserData.email || null,
          handle: newUserData.handle || null,
          bio: newUserData.bio || null,
          avatar_color: newUserData.avatar_color
        }])
        .select()
        .single()

      if (error) throw error

      // Add to local state and sort alphabetically
      setAvailableUsers([...availableUsers, data].sort((a, b) => a.name.localeCompare(b.name)))
      
      // Automatically select the new user
      setCurrentUser(data)
      localStorage.setItem('branch_current_user', data.id)
      setProfileEditData({
        name: data.name,
        handle: data.handle || '',
        email: data.email || '',
        phone: data.phone || '',
        bio: data.bio || ''
      })
      
      setNewUserData({
        name: '',
        handle: '',
        email: '',
        phone: '',
        bio: '',
        avatar_color: 'from-green-500 to-green-600'
      })
      
      setIsCreatingNewUser(false)
      alert('New user created and selected successfully!')
      
      // Redirect to welcome screen
      setTimeout(() => {
        setCurrentScreen('welcome')
      }, 500)
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Error creating user. Please try again.')
    }
  }

  const searchEditConnectionLocations = async (query: string) => {
    if (query.length < 3) {
      setEditConnectionLocationSuggestions([])
      setShowEditConnectionLocationSuggestions(false)
      return
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}&addressdetails=1`
      )
      
      if (!response.ok) throw new Error('Search failed')
      
      const data = await response.json()
      
      const suggestions = data.map((item: any) => ({
        display_name: item.display_name,
        formatted: formatAddress(item),
        lat: item.lat,
        lon: item.lon,
        place_id: item.place_id
      }))
      
      setEditConnectionLocationSuggestions(suggestions)
      setShowEditConnectionLocationSuggestions(suggestions.length > 0)
    } catch (error) {
      console.error('Error searching locations:', error)
      setEditConnectionLocationSuggestions([])
      setShowEditConnectionLocationSuggestions(false)
    }
  }

  const getCurrentEditConnectionLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser')
      return
    }

    setIsGettingEditConnectionLocation(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          )
          
          if (!response.ok) throw new Error('Reverse geocoding failed')
          
          const data = await response.json()
          const formattedAddress = formatAddress(data)
          
          setEditConnectionData({...editConnectionData, location: formattedAddress})
          setShowEditConnectionLocationSuggestions(false)
        } catch (error) {
          console.error('Error getting location:', error)
          alert('Error getting your location. Please enter manually.')
        } finally {
          setIsGettingEditConnectionLocation(false)
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        setIsGettingEditConnectionLocation(false)
        
        let message = 'Error getting location: '
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message += 'Location access denied by user'
            break
          case error.POSITION_UNAVAILABLE:
            message += 'Location information unavailable'
            break
          case error.TIMEOUT:
            message += 'Location request timed out'
            break
          default:
            message += 'Unknown error occurred'
        }
        alert(message)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  const selectEditConnectionLocation = (suggestion: any) => {
    setEditConnectionData({...editConnectionData, location: suggestion.formatted})
    setEditConnectionLocationSuggestions([])
    setShowEditConnectionLocationSuggestions(false)
  }

  const editConnection = (connection: any) => {
    setEditingConnection(connection)
    setEditConnectionData({
      name: connection.connectee_name,
      phone: connection.connectee_phone || '',
      email: connection.connectee_email || '',
      social: connection.connectee_social || '',
      location: connection.location_name || '',
      notes: connection.notes || ''
    })
    // Set existing photo if available
    setEditConnectionPhotoPreview(connection.photo_url || null)
    setEditConnectionPhoto(null)
    setIsEditingConnection(true)
  }

  const handleEditConnectionPhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setEditConnectionPhoto(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setEditConnectionPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditConnectionCameraCapture = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = (event: any) => {
      const file = event.target.files?.[0]
      if (file) {
        setEditConnectionPhoto(file)
        const reader = new FileReader()
        reader.onload = (e) => {
          setEditConnectionPhotoPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const handleEditConnectionLocationInputChange = (value: string) => {
    setEditConnectionData({...editConnectionData, location: value})
    if (value.trim()) {
      const timeoutId = setTimeout(() => {
        searchEditConnectionLocations(value)
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setEditConnectionLocationSuggestions([])
      setShowEditConnectionLocationSuggestions(false)
    }
  }

  const updateConnection = async () => {
    if (!editConnectionData.name.trim()) {
      alert('Please enter a name')
      return
    }

    if (!editingConnection) {
      alert('Connection not found')
      return
    }

    // Validate inputs
    if (editConnectionData.email && !validateEmail(editConnectionData.email)) {
      alert('Please enter a valid email address')
      return
    }

    if (editConnectionData.phone && !validatePhoneNumber(editConnectionData.phone)) {
      alert('Please enter a valid 10-digit phone number')
      return
    }

    let photoUrl = editingConnection.photo_url // Keep existing photo URL by default

    // Upload new photo if one was selected
    if (editConnectionPhoto) {
      setIsUploadingEditConnectionPhoto(true)
      try {
        const fileExt = editConnectionPhoto.name.split('.').pop()
        const fileName = currentUser.id + '-' + Date.now() + '.' + fileExt
        const filePath = 'connection-photos/' + fileName

        const { data, error } = await supabase.storage
          .from('photos')
          .upload(filePath, editConnectionPhoto)

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath)

        photoUrl = publicUrl
      } catch (error) {
        console.error('Error uploading photo:', error)
        alert('Error uploading photo. Connection will be saved without new photo.')
      } finally {
        setIsUploadingEditConnectionPhoto(false)
      }
    }

    // Format phone number
    const formattedPhone = editConnectionData.phone ? formatPhoneNumber(editConnectionData.phone) : null

    try {
      const { data, error } = await supabase
        .from('connections')
        .update({
          connectee_name: editConnectionData.name.trim(),
          connectee_phone: formattedPhone,
          connectee_email: editConnectionData.email || null,
          connectee_social: editConnectionData.social || null,
          location_name: editConnectionData.location || null,
          notes: editConnectionData.notes || null,
          photo_url: photoUrl
        })
        .eq('id', editingConnection.id)

      if (error) throw error

      // Update local state
      const updatedConnection = {
        ...editingConnection,
        connectee_name: editConnectionData.name.trim(),
        connectee_phone: formattedPhone,
        connectee_email: editConnectionData.email || null,
        connectee_social: editConnectionData.social || null,
        location_name: editConnectionData.location || null,
        notes: editConnectionData.notes || null,
        photo_url: photoUrl
      }

      setConnections(connections.map(conn => 
        conn.id === editingConnection.id ? updatedConnection : conn
      ))
      setFilteredConnections(filteredConnections.map(conn => 
        conn.id === editingConnection.id ? updatedConnection : conn
      ))

      setIsEditingConnection(false)
      setEditingConnection(null)
      setEditConnectionPhoto(null)
      setEditConnectionPhotoPreview(null)
      alert('Connection updated successfully!')
    } catch (error) {
      console.error('Error updating connection:', error)
      alert('Error updating connection. Please try again.')
    }
  }

  const signOutAllUsers = () => {
    setCurrentUser(null)
    localStorage.removeItem('branch_current_user')
    setCurrentScreen('user-picker')
  }

  const scrollToTop = () => {
    const groveContainer = document.querySelector('.grove-scroll-container')
    if (groveContainer) {
      groveContainer.scrollTop = 0
    }
  }

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedPhoto(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCameraCapture = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = (event: any) => {
      const file = event.target.files?.[0]
      if (file) {
        setSelectedPhoto(file)
        const reader = new FileReader()
        reader.onload = (e) => {
          setPhotoPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      setIsUploadingPhoto(true)
      
      const fileExt = file.name.split('.').pop()
      const fileName = currentUser.id + '-' + Date.now() + '.' + fileExt
      const filePath = 'connection-photos/' + fileName

      const { data, error } = await supabase.storage
        .from('photos')
        .upload(filePath, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      return null
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const validateSerial = (serial: string) => {
    const regex = /^\d{3}-\d{3}$/
    if (!regex.test(serial)) {
      alert('Please enter a valid serial number format (XXX-XXX)')
      return false
    }
    
    const promptId = serial.split('-')[0]
    if (!prompts[promptId]) {
      alert('Invalid prompt ID. Please check your card.')
      return false
    }
    
    setCurrentPrompt(prompts[promptId])
    setCurrentSerial(serial)
    setCurrentScreen('capture-connection')
    return true
  }

  const selectDigitalPrompt = (prompt: any) => {
    setCurrentPrompt(prompt.prompt_text)
    setCurrentSerial(`${prompt.prompt_id}-000`)
    setCurrentScreen('capture-connection')
  }

  const saveConnection = async () => {
    if (!formData.name.trim()) {
      alert('Please enter the person\'s name')
      return
    }

    if (!currentUser) {
      alert('Please select a user profile first')
      setCurrentScreen('user-required')
      return
    }

    // Validate inputs
    if (formData.email && !validateEmail(formData.email)) {
      alert('Please enter a valid email address')
      return
    }

    if (formData.phone && !validatePhoneNumber(formData.phone)) {
      alert('Please enter a valid 10-digit phone number')
      return
    }

    let photoUrl = null
    
    if (selectedPhoto) {
      photoUrl = await uploadPhoto(selectedPhoto)
      if (!photoUrl) {
        alert('Error uploading photo. Connection will be saved without photo.')
      }
    }

    // Format phone number
    const formattedPhone = formData.phone ? formatPhoneNumber(formData.phone) : null

    try {
      const { data, error } = await supabase
        .from('connections')
        .insert([
          {
            user_id: currentUser.id,
            connectee_name: formData.name.trim(),
            connectee_email: formData.email || null,
            connectee_phone: formattedPhone,
            connectee_social: formData.social || null,
            location_name: formData.location || null,
            notes: formData.notes || null,
            prompt_text: currentPrompt,
            card_serial: currentSerial,
            photo_url: photoUrl
          }
        ])

      if (error) throw error

      setFormData({ name: '', email: '', phone: '', social: '', location: '', notes: '' })
      setSelectedPhoto(null)
      setPhotoPreview(null)
      setCurrentScreen('success')
      
      console.log('Connection saved!', data)
    } catch (error) {
      console.error('Error saving connection:', error)
      alert('Error saving connection. Please try again.')
    }
  }

  const updateProfile = async () => {
    if (!profileEditData.name) {
      alert('Please enter your name')
      return
    }

    if (!currentUser) {
      alert('User profile not loaded. Please try again.')
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          name: profileEditData.name,
          handle: profileEditData.handle || null,
          email: profileEditData.email || null,
          phone: profileEditData.phone || null,
          bio: profileEditData.bio || null
        })
        .eq('id', currentUser.id)

      if (error) throw error

      const updatedUser = {
        ...currentUser,
        name: profileEditData.name,
        handle: profileEditData.handle || null,
        email: profileEditData.email || null,
        phone: profileEditData.phone || null,
        bio: profileEditData.bio || null
      }

      setCurrentUser(updatedUser)
      
      // Update and sort the availableUsers array
      setAvailableUsers(availableUsers.map(user => 
        user.id === currentUser.id ? updatedUser : user
      ).sort((a, b) => a.name.localeCompare(b.name)))

      setIsEditingProfile(false)
      
      // Stay on profile tab and scroll to top
      setTimeout(() => {
        scrollToTop()
      }, 100)
      
      alert('Profile updated successfully!')
      
      console.log('Profile updated!', data)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 via-green-700 to-green-600">
      <div className="container mx-auto max-w-md p-5">
        <div className="text-center mb-10 text-white">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-transform"
               onClick={() => setCurrentScreen('welcome')}>
            <span className="text-3xl">🍃</span>
          </div>
          <h1 className="text-4xl font-bold mb-1">Branch Out</h1>
          <p className="text-sm opacity-90">Real connections. Real moments.</p>
        </div>

        {viewingPhoto && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-4 max-w-sm w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">Connection Photo</h3>
                <button 
                  onClick={() => setViewingPhoto(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl">
                  ✕
                </button>
              </div>
              <img 
                src={viewingPhoto} 
                alt="Connection photo" 
                className="w-full rounded-lg"
              />
            </div>
          </div>
        )}

        {currentScreen === 'welcome' && (
          <div className="bg-white/95 rounded-3xl p-8 shadow-xl backdrop-blur">
            <button 
              className="w-full p-4 mb-4 bg-green-100 text-green-700 rounded-xl border-2 border-green-200 font-semibold hover:bg-green-200 transition-colors"
              onClick={startCapture}>
              Capture a Connection
            </button>
            <button 
              className="w-full p-4 mb-4 bg-green-100 text-green-700 rounded-xl border-2 border-green-200 font-semibold hover:bg-green-200 transition-colors"
              onClick={() => {
                if (!currentUser) {
                  setCurrentScreen('user-required')
                  return
                }
                setCurrentScreen('my-grove')
              }}>
              My Grove
            </button>
            <button 
              className="w-full p-4 bg-green-100 text-green-700 rounded-xl border-2 border-green-200 font-semibold hover:bg-green-200 transition-colors"
              onClick={() => setCurrentScreen('user-picker')}>
              Switch User
            </button>
          </div>
        )}

        {currentScreen === 'user-picker' && (
          <div className="bg-white/95 rounded-3xl p-8 shadow-xl backdrop-blur">
            <button 
              className="text-green-600 mb-5 flex items-center gap-2 hover:underline"
              onClick={() => setCurrentScreen('welcome')}>
              ← Back
            </button>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Select Your Profile</h2>
            
            <div className="space-y-4 max-h-80 overflow-y-auto mb-6">
              {availableUsers.map((user) => {
                const isSelected = currentUser && currentUser.id === user.id
                return (
                  <div 
                    key={user.id}
                    className={`bg-gradient-to-r from-white to-green-50 border-2 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 ${
                      isSelected ? 'border-green-500 bg-green-50' : 'border-green-200 hover:border-green-300'
                    }`}
                    onClick={() => selectUser(user.id)}>
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 bg-gradient-to-r ${user.avatar_color || 'from-gray-500 to-gray-600'} rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
                        {getInitials(user.name)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800">{user.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">{user.bio || 'Branch user'}</p>
                      </div>
                      {isSelected && (
                        <div className="text-green-500 text-2xl">✓</div>
                      )}
                    </div>
                  </div>
                )
              })}
              
              <button 
                className="w-full p-4 bg-green-100 text-green-700 rounded-xl border-2 border-green-200 font-semibold hover:bg-green-200 transition-colors"
                onClick={() => setIsCreatingNewUser(true)}>
                Add New User
              </button>
            </div>
          </div>
        )}

        {isCreatingNewUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Create New User</h3>
                <button 
                  onClick={() => setIsCreatingNewUser(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl">
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Name*</label>
                  <input 
                    type="text" 
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Phone Number</label>
                  <input 
                    type="tel" 
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Email</label>
                  <input 
                    type="email" 
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Social</label>
                  <input 
                    type="text" 
                    placeholder="@username"
                    value={newUserData.handle}
                    onChange={(e) => setNewUserData({...newUserData, handle: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Bio</label>
                  <textarea 
                    rows={3}
                    placeholder="Tell others about yourself..."
                    value={newUserData.bio}
                    onChange={(e) => setNewUserData({...newUserData, bio: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Avatar Color</label>
                  <select 
                    value={newUserData.avatar_color}
                    onChange={(e) => setNewUserData({...newUserData, avatar_color: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none">
                    <option value="from-green-500 to-green-600">Green</option>
                    <option value="from-blue-500 to-blue-600">Blue</option>
                    <option value="from-amber-500 to-amber-600">Amber</option>
                    <option value="from-pink-500 to-pink-600">Pink</option>
                    <option value="from-purple-500 to-purple-600">Purple</option>
                    <option value="from-red-500 to-red-600">Red</option>
                    <option value="from-indigo-500 to-indigo-600">Indigo</option>
                    <option value="from-teal-500 to-teal-600">Teal</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button 
                  className="flex-1 p-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                  onClick={createNewUser}>
                  Create User
                </button>
                <button 
                  className="flex-1 p-3 bg-green-100 text-green-700 rounded-xl border-2 border-green-200 font-semibold hover:bg-green-200 transition-colors"
                  onClick={() => setIsCreatingNewUser(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {currentScreen === 'user-required' && (
          <div className="bg-white/95 rounded-3xl p-8 shadow-xl backdrop-blur">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 text-center">Please Sign In</h2>
            <button 
              className="w-full p-4 mb-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
              onClick={() => setCurrentScreen('user-picker')}>
              Select User
            </button>
            <button 
              className="w-full p-4 bg-green-100 text-green-700 rounded-xl border-2 border-green-200 font-semibold hover:bg-green-200 transition-colors"
              onClick={() => setCurrentScreen('welcome')}>
              Back to Home
            </button>
          </div>
        )}

        {currentScreen === 'capture-serial' && (
          <div className="bg-white/95 rounded-3xl p-8 shadow-xl backdrop-blur">
            <button 
              className="text-green-600 mb-5 flex items-center gap-2 hover:underline"
              onClick={() => setCurrentScreen('welcome')}>
              ← Back
            </button>
            <h2 className="text-2xl font-bold mb-5 text-gray-800">Let's Connect!</h2>
            
            <div className="mb-5">
              <label className="block mb-2 font-semibold text-gray-700">Branch Card Number</label>
              <input 
                type="text" 
                placeholder="001-000" 
                maxLength={7}
                id="serial-input"
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
              />
            </div>
            
            <button 
              className="w-full p-4 mb-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
              onClick={() => {
                const input = document.getElementById('serial-input') as HTMLInputElement
                validateSerial(input.value)
              }}>
              Continue
            </button>
            
            <button 
              className="w-full p-4 mb-4 bg-green-100 text-green-700 rounded-xl border-2 border-green-200 font-semibold hover:bg-green-200 transition-colors"
              onClick={() => {
                loadAllPrompts()
                setCurrentScreen('browse-prompts')
              }}>
              See All Prompts
            </button>
            
            <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-lg border-dashed">
              <p className="text-sm text-green-700 text-center font-semibold mb-2">Active Prompts:</p>
              <p className="text-xs text-gray-600 text-center">
                {Object.keys(prompts).map(id => `${id}-000`).join(' • ')}
              </p>
            </div>
          </div>
        )}

        {currentScreen === 'browse-prompts' && (
          <div className="bg-white/95 rounded-3xl p-8 shadow-xl backdrop-blur">
            <button 
              className="text-green-600 mb-5 flex items-center gap-2 hover:underline"
              onClick={() => setCurrentScreen('capture-serial')}>
              ← Back
            </button>
            <h2 className="text-2xl font-bold mb-5 text-gray-800">Connection Prompts</h2>
            
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {allPrompts.map((prompt) => (
                <div 
                  key={prompt.prompt_id}
                  className="bg-gradient-to-r from-white to-green-50 border-2 border-green-200 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 hover:border-green-300"
                  onClick={() => selectDigitalPrompt(prompt)}>
                  <div className="font-bold text-lg text-gray-800 mb-2">
                    {prompt.prompt_text}
                  </div>
                  <div className="text-sm text-green-600 font-semibold">
                    {prompt.prompt_id}-000
                  </div>
                </div>
              ))}
              
              <button 
                className="w-full p-4 bg-green-100 text-green-700 rounded-xl border-2 border-green-200 font-semibold hover:bg-green-200 transition-colors"
                onClick={() => setIsCreatingNewPrompt(true)}>
                Create New Prompt
              </button>
              
              {allPrompts.length === 0 && (
                <p className="text-center text-gray-500 py-8">No prompts available</p>
              )}
            </div>
          </div>
        )}

        {isCreatingNewPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Create New Prompt</h3>
                <button 
                  onClick={() => setIsCreatingNewPrompt(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl">
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <textarea 
                  rows={3}
                  placeholder="Enter your conversation starter..."
                  value={newPromptText}
                  onChange={(e) => setNewPromptText(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  className="flex-1 p-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                  onClick={createNewPrompt}>
                  Create Prompt
                </button>
                <button 
                  className="flex-1 p-3 bg-green-100 text-green-700 rounded-xl border-2 border-green-200 font-semibold hover:bg-green-200 transition-colors"
                  onClick={() => setIsCreatingNewPrompt(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {currentScreen === 'capture-connection' && (
          <div className="bg-white/95 rounded-3xl p-8 shadow-xl backdrop-blur">
            <button 
              className="text-green-600 mb-5 flex items-center gap-2 hover:underline"
              onClick={() => {
                clearLocationData()
                setCurrentScreen('capture-serial')
              }}>
              ← Back
            </button>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Your Connection</h2>
            <div className="bg-green-100 p-3 rounded-lg mb-6 italic text-green-700">
              "{currentPrompt}"
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-semibold text-gray-700">Name*</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block mb-2 font-semibold text-gray-700">Phone Number</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-semibold text-gray-700">Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-semibold text-gray-700">Social</label>
                <input 
                  type="text" 
                  placeholder="@username"
                  value={formData.social}
                  onChange={(e) => setFormData({...formData, social: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-semibold text-gray-700">Location</label>
                <div className="relative location-input-container">
                  <div className="flex gap-2 mb-2">
                    <input 
                      type="text" 
                      placeholder="Start typing an address..."
                      value={formData.location}
                      onChange={(e) => handleLocationInputChange(e.target.value)}
                      className="flex-1 p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                      onFocus={() => {
                        if (formData.location && locationSuggestions.length > 0) {
                          setShowLocationSuggestions(true)
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation}
                      title="Use my location"
                      className="w-12 h-12 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                      {isGettingLocation ? (
                        <span className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <span className="text-lg">📍</span>
                      )}
                    </button>
                  </div>
                  
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                      {locationSuggestions.map((suggestion, index) => (
                        <div
                          key={suggestion.place_id || index}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => selectLocation(suggestion)}>
                          <div className="font-medium text-gray-800 text-sm">
                            {suggestion.formatted}
                          </div>
                          {suggestion.formatted !== suggestion.display_name && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {suggestion.display_name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block mb-2 font-semibold text-gray-700">Notes</label>
                <textarea 
                  rows={3}
                  placeholder="What made this moment special?"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold text-gray-700">Photo</label>
                
                {!photoPreview ? (
                  <div className="space-y-3">
                    {isMobileDevice ? (
                      <>
                        <button
                          type="button"
                          onClick={handleCameraCapture}
                          className="w-full p-4 border-2 dashed border-green-300 rounded-xl bg-green-50 text-green-700 font-semibold hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
                          📷 Take Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => document.getElementById('photo-input')?.click()}
                          className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                          🖼 Choose from Gallery
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => document.getElementById('photo-input')?.click()}
                        className="w-full p-4 border-2 dashed border-green-300 rounded-xl bg-green-50 text-green-700 font-semibold hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
                        🖼 Select Photo
                      </button>
                    )}
                    <input
                      id="photo-input"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <img 
                        src={photoPreview} 
                        alt="Selected photo" 
                        className="w-full h-32 object-cover rounded-lg border-2 border-green-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPhoto(null)
                          setPhotoPreview(null)
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600">
                        ✕
                      </button>
                    </div>
                    <p className="text-sm text-green-600 text-center">✓ Photo ready to upload</p>
                  </div>
                )}
              </div>
            </div>
            
            <button 
              className="w-full p-4 mt-6 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
              onClick={saveConnection}
              disabled={isUploadingPhoto}>
              {isUploadingPhoto ? 'Saving...' : 'Save Connection'}
            </button>
          </div>
        )}

        {currentScreen === 'my-grove' && currentUser && (
          <div className="bg-white/95 rounded-3xl p-8 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between mb-5">
              <button 
                className="text-green-600 flex items-center gap-2 hover:underline"
                onClick={() => setCurrentScreen('welcome')}>
                ← Back
              </button>
              <div className={`w-12 h-12 bg-gradient-to-r ${currentUser.avatar_color || 'from-gray-500 to-gray-600'} rounded-full flex items-center justify-center text-white font-bold`}>
                {getInitials(currentUser.name)}
              </div>
            </div>
            
            <h2 className="text-2xl font-bold mb-5 text-gray-800">My Grove</h2>
            
            <div className="flex gap-1 mb-6 bg-green-100 rounded-xl p-1">
              <button 
                className={`flex-1 p-3 rounded-lg font-semibold transition-colors text-sm ${
                  activeTab === 'connections' 
                    ? 'bg-white text-green-700 shadow-sm' 
                    : 'text-gray-600 hover:text-green-600'
                }`}
                onClick={() => {
                  setActiveTab('connections')
                  setTimeout(() => scrollToTop(), 50)
                }}>
                Connections
              </button>
              <button 
                className={`flex-1 p-3 rounded-lg font-semibold transition-colors text-sm ${
                  activeTab === 'branches' 
                    ? 'bg-white text-green-700 shadow-sm' 
                    : 'text-gray-600 hover:text-green-600'
                }`}
                onClick={() => {
                  setActiveTab('branches')
                  setTimeout(() => scrollToTop(), 50)
                }}>
                Branches
              </button>
              <button 
                className={`flex-1 p-3 rounded-lg font-semibold transition-colors text-sm ${
                  activeTab === 'profile' 
                    ? 'bg-white text-green-700 shadow-sm' 
                    : 'text-gray-600 hover:text-green-600'
                }`}
                onClick={() => {
                  setActiveTab('profile')
                  setTimeout(() => scrollToTop(), 50)
                }}>
                Profile
              </button>
            </div>

            <div className="grove-scroll-container max-h-96 overflow-y-auto">
              {activeTab === 'connections' && (
                <>
                  <div className="mb-6">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Search connections..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-3 pr-10 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none mb-3"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-sm text-gray-600 font-medium flex items-center">Sort by:</span>
                      <button
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          connectionsSortBy === 'name' 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        onClick={() => setConnectionsSortBy('name')}>
                        Name
                      </button>
                      <button
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          connectionsSortBy === 'date' 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        onClick={() => setConnectionsSortBy('date')}>
                        Recent
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {filteredConnections.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        {searchQuery ? 'No connections found matching your search.' : 'No connections yet. Start branching out!'}
                      </p>
                    ) : (
                      filteredConnections.map((connection, index) => {
                        const initials = getInitials(connection.connectee_name)
                        return (
                          <div key={connection.id || index} className="bg-gradient-to-r from-white to-green-50 border border-green-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                            <div className="flex items-center mb-3">
                              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-3">
                                {initials}
                              </div>
                              <div className="flex-1">
                                <h3 className="font-bold text-lg text-gray-800">{connection.connectee_name}</h3>
                              </div>
                              <div className="flex gap-2">
                                {connection.photo_url && (
                                  <button
                                    onClick={() => setViewingPhoto(connection.photo_url)}
                                    className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors">
                                    📸
                                  </button>
                                )}
                                <button
                                  onClick={() => editConnection(connection)}
                                  className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors">
                                  ✏️
                                </button>
                                <button
                                  onClick={() => setConnectionToDelete(connection)}
                                  className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors">
                                  🗑
                                </button>
                              </div>
                            </div>
                            
                            <div className="bg-green-100 p-2 rounded-lg mb-3 italic text-green-700 text-sm">
                              "{connection.prompt_text}"
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600">
                              {connection.location_name && (
                                <div className="flex items-center gap-2">
                                  <span>📍</span>
                                  <span>{connection.location_name}</span>
                                </div>
                              )}
                              {connection.connectee_phone && (
                                <div className="flex items-center gap-2">
                                  <span>📞</span>
                                  <a 
                                    href={`sms:${connection.connectee_phone}`}
                                    className="text-blue-600 hover:underline">
                                    {connection.connectee_phone}
                                  </a>
                                </div>
                              )}
                              {connection.connectee_email && (
                                <div className="flex items-center gap-2">
                                  <span>📧</span>
                                  <a 
                                    href={`mailto:${connection.connectee_email}`}
                                    className="text-blue-600 hover:underline">
                                    {connection.connectee_email}
                                  </a>
                                </div>
                              )}
                              {connection.connectee_social && (
                                <div className="flex items-center gap-2">
                                  <span>📱</span>
                                  <span>{connection.connectee_social}</span>
                                </div>
                              )}
                              {connection.notes && (
                                <div className="bg-gray-50 p-2 rounded italic text-gray-600 mt-2">
                                  💭 {connection.notes}
                                </div>
                              )}
                              
                              <div className="text-center pt-2 mt-3 border-t border-green-100 text-xs text-gray-400">
                                {formatDate(connection.created_at)}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              )}

              {activeTab === 'branches' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4 italic">
                    See how each prompt grows community
                  </p>
                  
                  {promptStats.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No branch data yet. Start making connections to see how prompts spread!
                    </p>
                  ) : (
                    promptStats.map((stat, index) => {
                      // Get user's connections for this prompt
                      const userConnections = connections.filter(conn => 
                        conn.prompt_text === stat.prompt_text
                      ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      
                      // Get recent locations (up to 10, sorted by most recent)
                      const allLocationsWithDates = stat.sample_connections
                        .filter(conn => conn.location_name)
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      
                      const recentLocations = [...new Set(allLocationsWithDates.map(c => c.location_name))].slice(0, 10)
                      const totalUniqueLocations = stat.unique_locations
                      const remainingLocations = Math.max(0, totalUniqueLocations - 10)
                      
                      return (
                        <div key={index} className="bg-gradient-to-r from-green-50 to-white border border-green-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                          <div className="mb-4">
                            <div className="bg-green-100 p-3 rounded-lg italic text-green-700 font-semibold">
                              {stat.prompt_text}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6 mb-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">{stat.connection_count}</div>
                              <div className="text-xs text-gray-500">Connections</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{stat.unique_locations}</div>
                              <div className="text-xs text-gray-500">Locations</div>
                            </div>
                          </div>
                          
                          {recentLocations.length > 0 && (
                            <div className="mb-3">
                              <div className="text-sm font-semibold text-gray-700 mb-2">Recent Locations:</div>
                              <div className="flex flex-wrap gap-2">
                                {recentLocations.map((location: string, idx: number) => (
                                  <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                                    📍 {location}
                                  </span>
                                ))}
                              </div>
                              {remainingLocations > 0 && (
                                <p className="text-xs text-gray-500 mt-2">
                                  {remainingLocations} more locations
                                </p>
                              )}
                            </div>
                          )}
                          
                          <div className="border-t border-green-100 pt-3">
                            <div className="text-sm font-semibold text-gray-700 mb-2">Your Connections:</div>
                            {userConnections.length === 0 ? (
                              <p className="text-xs text-gray-500">No connections yet with this prompt</p>
                            ) : (
                              <div className="space-y-1">
                                {userConnections.map((conn: any, idx: number) => (
                                  <div key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-600">
                                      {getInitials(conn.connectee_name).slice(0, 1)}
                                    </div>
                                    <button
                                      className="text-blue-600 hover:underline font-medium"
                                      onClick={() => {
                                        setActiveTab('connections')
                                        setTimeout(() => {
                                          setSearchQuery(conn.connectee_name)
                                          scrollToTop()
                                        }, 50)
                                      }}>
                                      {conn.connectee_name}
                                    </button>
                                    {conn.location_name && (
                                      <>
                                        <span>•</span>
                                        <span className="text-gray-500">{conn.location_name}</span>
                                      </>
                                    )}
                                    <span>•</span>
                                    <span className="text-gray-400">
                                      {new Date(conn.created_at).toLocaleDateString('en-US', {
                                        month: 'numeric',
                                        day: 'numeric',
                                        year: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

             {activeTab === 'profile' && (
               <div className="space-y-6">
                 {!isEditingProfile ? (
                   <>
                     <div className="bg-gradient-to-r from-green-50 to-white border border-green-200 rounded-2xl p-6">
                       <div className="text-center">
                         <div className={`w-20 h-20 bg-gradient-to-r ${currentUser.avatar_color || 'from-gray-500 to-gray-600'} rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4`}>
                           {getInitials(currentUser.name)}
                         </div>
                         <h3 className="text-xl font-bold text-gray-800 mb-2">{currentUser.name}</h3>
                         {currentUser.bio && (
                           <p className="text-gray-600 text-sm italic">{currentUser.bio}</p>
                         )}
                       </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white border border-green-200 rounded-xl p-4 text-center">
                         <div className="text-2xl font-bold text-green-600">{connections.length}</div>
                         <div className="text-sm text-gray-500">Connections Made</div>
                       </div>
                       <div className="bg-white border border-green-200 rounded-xl p-4 text-center">
                         <div className="text-2xl font-bold text-blue-600">
                           {[...new Set(connections.map(c => c.location_name).filter(Boolean))].length}
                         </div>
                         <div className="text-sm text-gray-500">Unique Locations</div>
                       </div>
                     </div>
                     
                     <div className="bg-white border border-green-200 rounded-xl p-4">
                       <h4 className="font-semibold text-gray-800 mb-3">Recent Activity</h4>
                       {connections.slice(0, 3).map((conn, idx) => (
                         <div key={idx} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0">
                           <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm font-bold">
                             {getInitials(conn.connectee_name).slice(0, 2)}
                           </div>
                           <div className="flex-1">
                             <div className="text-sm font-medium text-gray-800">
                               Connected with{' '}
                               <button
                                 className="text-blue-600 hover:underline"
                                 onClick={() => {
                                   setActiveTab('connections')
                                   setTimeout(() => {
                                     setSearchQuery(conn.connectee_name)
                                     scrollToTop()
                                   }, 50)
                                 }}>
                                 {conn.connectee_name}
                               </button>
                             </div>
                             <div className="text-xs text-gray-500">
                               {conn.location_name && `📍 ${conn.location_name} • `}
                               {formatDate(conn.created_at)}
                             </div>
                           </div>
                         </div>
                       ))}
                       {connections.length === 0 && (
                         <p className="text-gray-500 text-sm text-center py-4">No connections yet</p>
                       )}
                     </div>
                     
                     <div className="bg-white border border-green-200 rounded-xl p-4">
                       <h4 className="font-semibold text-gray-800 mb-3">Contact Info</h4>
                       <div className="space-y-2 text-sm">
                         {currentUser.email && (
                           <div className="flex items-center gap-2 text-gray-600">
                             <span>📧</span>
                             <span>{currentUser.email}</span>
                           </div>
                         )}
                         {currentUser.phone && (
                           <div className="flex items-center gap-2 text-gray-600">
                             <span>📞</span>
                             <span>{currentUser.phone}</span>
                           </div>
                         )}
                         {currentUser.handle && (
                           <div className="flex items-center gap-2 text-gray-600">
                             <span>📱</span>
                             <span>{currentUser.handle}</span>
                           </div>
                         )}
                         {!currentUser.email && !currentUser.phone && !currentUser.handle && (
                           <p className="text-gray-500 text-sm">No contact information available</p>
                         )}
                       </div>
                     </div>
                     
                     <div className="space-y-3">
                       <button 
                         className="w-full p-4 bg-green-100 text-green-700 rounded-xl border border-green-200 font-semibold hover:bg-green-200 transition-colors"
                         onClick={() => {
                           setIsEditingProfile(true)
                           setTimeout(() => scrollToTop(), 100)
                         }}>
                         Edit Profile
                       </button>
                       <button 
                         className="w-full p-4 bg-red-100 text-red-700 rounded-xl border border-red-200 font-semibold hover:bg-red-200 transition-colors"
                         onClick={signOutAllUsers}>
                         Sign Out
                       </button>
                       <button 
                         className="w-full p-4 bg-red-100 text-red-700 rounded-xl border border-red-200 font-semibold hover:bg-red-200 transition-colors"
                         onClick={() => setUserToDelete(currentUser)}>
                         Delete Account
                       </button>
                     </div>
                   </>
                 ) : (
                   <>
                     <div className="space-y-4">
                       <div>
                         <label className="block mb-2 font-semibold text-gray-700">Name*</label>
                         <input 
                           type="text" 
                           value={profileEditData.name}
                           onChange={(e) => setProfileEditData({...profileEditData, name: e.target.value})}
                           className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                           required
                         />
                       </div>
                       
                       <div>
                         <label className="block mb-2 font-semibold text-gray-700">Social</label>
                         <input 
                           type="text" 
                           placeholder="@username"
                           value={profileEditData.handle}
                           onChange={(e) => setProfileEditData({...profileEditData, handle: e.target.value})}
                           className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                         />
                       </div>
                       
                       <div>
                         <label className="block mb-2 font-semibold text-gray-700">Email</label>
                         <input 
                           type="email" 
                           value={profileEditData.email}
                           onChange={(e) => setProfileEditData({...profileEditData, email: e.target.value})}
                           className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                         />
                       </div>
                       
                       <div>
                         <label className="block mb-2 font-semibold text-gray-700">Phone</label>
                         <input 
                           type="tel" 
                           value={profileEditData.phone}
                           onChange={(e) => setProfileEditData({...profileEditData, phone: e.target.value})}
                           className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                         />
                       </div>
                       
                       <div>
                         <label className="block mb-2 font-semibold text-gray-700">Bio</label>
                         <textarea 
                           rows={3}
                           placeholder="Tell others about yourself..."
                           value={profileEditData.bio}
                           onChange={(e) => setProfileEditData({...profileEditData, bio: e.target.value})}
                           className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                         />
                       </div>
                     </div>
                     
                     <div className="flex gap-3">
                       <button 
                         className="flex-1 p-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                         onClick={updateProfile}>
                         Save Changes
                       </button>
                       <button 
                         className="flex-1 p-4 bg-green-100 text-green-700 rounded-xl border-2 border-green-200 font-semibold hover:bg-green-200 transition-colors"
                         onClick={() => {
                           setIsEditingProfile(false)
                           setTimeout(() => scrollToTop(), 100)
                         }}>
                         Cancel
                       </button>
                     </div>
                   </>
                 )}
               </div>
             )}
           </div>
         </div>
       )}

       {currentScreen === 'success' && (
         <div className="bg-white/95 rounded-3xl p-8 shadow-xl backdrop-blur">
           <div className="bg-green-100 border border-green-500 rounded-xl p-4 mb-6 text-green-800 text-center font-semibold">
             Connection Saved Successfully!
           </div>
           <p className="text-center text-gray-600 mb-6">
             Your new connection has been captured and saved to the database.
           </p>
           <button 
             className="w-full p-4 mb-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
             onClick={() => setCurrentScreen('capture-serial')}>
             Make Another Connection
           </button>
           <button 
             className="w-full p-4 bg-green-100 text-green-700 rounded-xl border-2 border-green-200 font-semibold hover:bg-green-200 transition-colors"
             onClick={() => setCurrentScreen('my-grove')}>
             View My Grove
           </button>
         </div>
       )}

        {connectionToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Delete Connection?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete your connection with <strong>{connectionToDelete.connectee_name}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  className="flex-1 p-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                  onClick={() => deleteConnection(connectionToDelete.id)}>
                  Delete
                </button>
                <button 
                  className="flex-1 p-3 bg-gray-100 text-gray-700 rounded-xl border border-gray-200 font-semibold hover:bg-gray-200 transition-colors"
                  onClick={() => setConnectionToDelete(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {userToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Delete User Profile?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{userToDelete.name}</strong>? This will permanently delete:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-6 space-y-1">
                <li>The user profile</li>
                <li>All connections made by this user</li>
                <li>All associated data</li>
              </ul>
              <p className="text-red-600 font-semibold mb-6">This action cannot be undone!</p>
              <div className="flex gap-3">
                <button 
                  className="flex-1 p-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                  onClick={() => deleteUser(userToDelete.id)}>
                  Delete User
                </button>
                <button 
                  className="flex-1 p-3 bg-gray-100 text-gray-700 rounded-xl border border-gray-200 font-semibold hover:bg-gray-200 transition-colors"
                  onClick={() => setUserToDelete(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isEditingConnection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Edit Connection</h3>
                <button 
                  onClick={() => {
                    setIsEditingConnection(false)
                    setEditConnectionLocationSuggestions([])
                    setShowEditConnectionLocationSuggestions(false)
                  }}
                  className="text-gray-500 hover:text-gray-700 text-xl">
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Name*</label>
                  <input 
                    type="text" 
                    value={editConnectionData.name}
                    onChange={(e) => setEditConnectionData({...editConnectionData, name: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Phone Number</label>
                  <input 
                    type="tel" 
                    value={editConnectionData.phone}
                    onChange={(e) => setEditConnectionData({...editConnectionData, phone: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Email</label>
                  <input 
                    type="email" 
                    value={editConnectionData.email}
                    onChange={(e) => setEditConnectionData({...editConnectionData, email: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Social Handle</label>
                  <input 
                    type="text" 
                    placeholder="@username"
                    value={editConnectionData.social}
                    onChange={(e) => setEditConnectionData({...editConnectionData, social: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Location</label>
                  <div className="relative location-input-container">
                    <div className="flex gap-2 mb-2">
                      <input 
                        type="text" 
                        placeholder="Start typing an address..."
                        value={editConnectionData.location}
                        onChange={(e) => handleEditConnectionLocationInputChange(e.target.value)}
                        className="flex-1 p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                        onFocus={() => {
                          if (editConnectionData.location && editConnectionLocationSuggestions.length > 0) {
                            setShowEditConnectionLocationSuggestions(true)
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={getCurrentEditConnectionLocation}
                        disabled={isGettingEditConnectionLocation}
                        title="Use my location"
                        className="w-12 h-12 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                        {isGettingEditConnectionLocation ? (
                          <span className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <span className="text-lg">📍</span>
                        )}
                      </button>
                    </div>
                    
                    {showEditConnectionLocationSuggestions && editConnectionLocationSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                        {editConnectionLocationSuggestions.map((suggestion, index) => (
                          <div
                            key={suggestion.place_id || index}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => selectEditConnectionLocation(suggestion)}>
                            <div className="font-medium text-gray-800 text-sm">
                              {suggestion.formatted}
                            </div>
                            {suggestion.formatted !== suggestion.display_name && (
                              <div className="text-xs text-gray-500 mt-1 truncate">
                                {suggestion.display_name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Notes</label>
                  <textarea 
                    rows={3}
                    placeholder="What made this moment special?"
                    value={editConnectionData.notes}
                    onChange={(e) => setEditConnectionData({...editConnectionData, notes: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Photo</label>
                  
                  {!editConnectionPhotoPreview ? (
                    <div className="space-y-3">
                      {isMobileDevice ? (
                        <>
                          <button
                            type="button"
                            onClick={handleEditConnectionCameraCapture}
                            className="w-full p-4 border-2 dashed border-green-300 rounded-xl bg-green-50 text-green-700 font-semibold hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
                            📷 Take Photo
                          </button>
                          <button
                            type="button"
                            onClick={() => document.getElementById('edit-photo-input')?.click()}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                            🖼 Choose from Gallery
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => document.getElementById('edit-photo-input')?.click()}
                          className="w-full p-4 border-2 dashed border-green-300 rounded-xl bg-green-50 text-green-700 font-semibold hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
                          🖼 Select Photo
                        </button>
                      )}
                      <input
                        id="edit-photo-input"
                        type="file"
                        accept="image/*"
                        onChange={handleEditConnectionPhotoSelect}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <img 
                          src={editConnectionPhotoPreview} 
                          alt="Connection photo" 
                          className="w-full h-32 object-cover rounded-lg border-2 border-green-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEditConnectionPhoto(null)
                            setEditConnectionPhotoPreview(null)
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600">
                          ✕
                        </button>
                      </div>
                      <p className="text-sm text-green-600 text-center">
                        {editConnectionPhoto ? '✓ New photo ready to upload' : '📸 Current photo'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button 
                  className="flex-1 p-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                  onClick={updateConnection}
                  disabled={isUploadingEditConnectionPhoto}>
                  {isUploadingEditConnectionPhoto ? 'Updating...' : 'Save Changes'}
                </button>
                <button 
                  className="flex-1 p-3 bg-gray-100 text-gray-700 rounded-xl border border-gray-200 font-semibold hover:bg-gray-200 transition-colors"
                  onClick={() => {
                    setIsEditingConnection(false)
                    setEditConnectionLocationSuggestions([])
                    setShowEditConnectionLocationSuggestions(false)
                  }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}