// ============ IMAGE UPLOAD FUNCTIONS ============

// Upload image to Supabase Storage
async function uploadImage(file, folder = 'logos') {
  if (!file) return { url: null, error: 'No file selected' };
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return { url: null, error: 'Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.' };
  }
  
  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return { url: null, error: 'Ukuran file maksimal 2MB.' };
  }
  
  if (!USE_REAL_DATA) {
    // Demo mode - return a fake URL
    await new Promise(resolve => setTimeout(resolve, 1000));
    const fakeUrl = URL.createObjectURL(file);
    return { url: fakeUrl, error: null };
  }
  
  try {
    // Generate unique filename
    const ext = file.name.split('.').pop().toLowerCase();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${currentUser.id}/${folder}/${timestamp}-${randomStr}.${ext}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseClient.storage
      .from('business-assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Upload error:', error);
      return { url: null, error: 'Gagal mengupload gambar: ' + error.message };
    }
    
    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('business-assets')
      .getPublicUrl(fileName);
    
    return { url: urlData.publicUrl, error: null };
  } catch (e) {
    console.error('Upload exception:', e);
    return { url: null, error: 'Terjadi kesalahan saat mengupload.' };
  }
}

// Delete image from storage
async function deleteImage(url) {
  if (!USE_REAL_DATA || !url) return;
  
  try {
    // Extract file path from URL
    const match = url.match(/business-assets\/(.+)$/);
    if (!match) return;
    
    const filePath = match[1];
    await supabaseClient.storage
      .from('business-assets')
      .remove([filePath]);
  } catch (e) {
    console.error('Delete image error:', e);
  }
}

// Handle logo upload
async function handleLogoUpload(file) {
  state.uploadingLogo = true;
  render();
  
  const { url, error } = await uploadImage(file, 'logos');
  
  state.uploadingLogo = false;
  
  if (error) {
    toast(error);
    render();
    return;
  }
  
  // Update the logo URL field
  const logoInput = document.getElementById('bp-logo');
  if (logoInput) {
    logoInput.value = url;
  }
  
  // Update preview
  state.businessProfile.logoUrl = url;
  render();
  toast('Logo berhasil diupload!');
}

// Handle banner upload
async function handleBannerUpload(file) {
  state.uploadingBanner = true;
  render();
  
  const { url, error } = await uploadImage(file, 'banners');
  
  state.uploadingBanner = false;
  
  if (error) {
    toast(error);
    render();
    return;
  }
  
  // Update the banner URL field
  const bannerInput = document.getElementById('bp-banner');
  if (bannerInput) {
    bannerInput.value = url;
  }
  
  // Update preview
  state.businessProfile.bannerUrl = url;
  render();
  toast('Banner berhasil diupload!');
}
