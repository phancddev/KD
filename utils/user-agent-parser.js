/**
 * User Agent Parser và Device Detection
 * Thu thập thông tin chi tiết về thiết bị, trình duyệt và hệ điều hành
 */

// Parse User Agent để lấy thông tin trình duyệt và OS
function parseUserAgent(userAgent) {
  if (!userAgent) {
    return {
      browser: { name: 'Unknown', version: 'Unknown' },
      os: { name: 'Unknown', version: 'Unknown' },
      device: { type: 'unknown', model: 'Unknown' }
    };
  }

  const ua = userAgent.toLowerCase();
  
  // Detect Browser
  let browser = { name: 'Unknown', version: 'Unknown' };
  
  if (ua.includes('chrome')) {
    browser.name = 'Chrome';
    const match = ua.match(/chrome\/(\d+\.\d+)/);
    if (match) browser.version = match[1];
  } else if (ua.includes('firefox')) {
    browser.name = 'Firefox';
    const match = ua.match(/firefox\/(\d+\.\d+)/);
    if (match) browser.version = match[1];
  } else if (ua.includes('safari')) {
    browser.name = 'Safari';
    const match = ua.match(/version\/(\d+\.\d+)/);
    if (match) browser.version = match[1];
  } else if (ua.includes('edge')) {
    browser.name = 'Edge';
    const match = ua.match(/edge\/(\d+\.\d+)/);
    if (match) browser.version = match[1];
  } else if (ua.includes('opera')) {
    browser.name = 'Opera';
    const match = ua.match(/opera\/(\d+\.\d+)/);
    if (match) browser.version = match[1];
  }

  // Detect OS
  let os = { name: 'Unknown', version: 'Unknown' };
  
  if (ua.includes('windows')) {
    os.name = 'Windows';
    if (ua.includes('windows nt 10')) os.version = '10';
    else if (ua.includes('windows nt 6.3')) os.version = '8.1';
    else if (ua.includes('windows nt 6.2')) os.version = '8';
    else if (ua.includes('windows nt 6.1')) os.version = '7';
    else if (ua.includes('windows nt 6.0')) os.version = 'Vista';
    else if (ua.includes('windows nt 5.1')) os.version = 'XP';
  } else if (ua.includes('mac os x')) {
    os.name = 'macOS';
    const match = ua.match(/mac os x (\d+[._]\d+)/);
    if (match) os.version = match[1].replace('_', '.');
  } else if (ua.includes('linux')) {
    os.name = 'Linux';
    if (ua.includes('ubuntu')) os.version = 'Ubuntu';
    else if (ua.includes('debian')) os.version = 'Debian';
    else if (ua.includes('centos')) os.version = 'CentOS';
    else if (ua.includes('fedora')) os.version = 'Fedora';
  } else if (ua.includes('android')) {
    os.name = 'Android';
    const match = ua.match(/android (\d+\.\d+)/);
    if (match) os.version = match[1];
  } else if (ua.includes('ios')) {
    os.name = 'iOS';
    const match = ua.match(/os (\d+[._]\d+)/);
    if (match) os.version = match[1].replace('_', '.');
  }

  // Detect Device Type
  let device = { type: 'desktop', model: 'Unknown' };
  
  if (ua.includes('mobile')) {
    device.type = 'mobile';
  } else if (ua.includes('tablet')) {
    device.type = 'tablet';
  } else if (ua.includes('ipad')) {
    device.type = 'tablet';
    device.model = 'iPad';
  } else if (ua.includes('iphone')) {
    device.type = 'mobile';
    device.model = 'iPhone';
  } else if (ua.includes('android')) {
    if (ua.includes('mobile')) {
      device.type = 'mobile';
    } else if (ua.includes('tablet')) {
      device.type = 'tablet';
    }
    
    // Detect Android device model
    const modelMatch = ua.match(/\(linux.*?; (.*?) build\)/i);
    if (modelMatch) {
      device.model = modelMatch[1].split(';')[0].trim();
    }
  }

  return { browser, os, device };
}

// Thu thập thông tin thiết bị từ client
function collectDeviceInfo(req) {
  const userAgent = req.headers['user-agent'];
  const parsed = parseUserAgent(userAgent);
  
  // Thu thập thông tin bổ sung từ headers
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const accept = req.headers['accept'] || '';
  
  // Thu thập thông tin từ client (nếu có)
  const clientInfo = {
    screen: req.body?.screen || req.query?.screen,
    timezone: req.body?.timezone || req.query?.timezone,
    language: req.body?.language || req.query?.language,
    colorDepth: req.body?.colorDepth || req.query?.colorDepth,
    platform: req.body?.platform || req.query?.platform
  };

  return {
    userAgent,
    browser: parsed.browser,
    os: parsed.os,
    device: parsed.device,
    acceptLanguage: acceptLanguage.split(',')[0]?.split(';')[0] || 'en',
    acceptEncoding,
    accept,
    ...clientInfo
  };
}

// Tạo device fingerprint
function generateDeviceFingerprint(deviceInfo) {
  const fingerprint = [
    deviceInfo.browser.name,
    deviceInfo.browser.version,
    deviceInfo.os.name,
    deviceInfo.os.version,
    deviceInfo.device.type,
    deviceInfo.device.model,
    deviceInfo.acceptLanguage,
    deviceInfo.screen,
    deviceInfo.timezone,
    deviceInfo.colorDepth,
    deviceInfo.platform
  ].filter(Boolean).join('|');
  
  // Tạo hash đơn giản
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(36);
}

// Kiểm tra thiết bị có đáng ngờ không
function detectSuspiciousActivity(deviceInfo, userHistory) {
  const suspicious = {
    isSuspicious: false,
    reasons: []
  };

  // Kiểm tra user agent bất thường
  if (!deviceInfo.userAgent || deviceInfo.userAgent.length < 10) {
    suspicious.isSuspicious = true;
    suspicious.reasons.push('User agent quá ngắn hoặc không hợp lệ');
  }

  // Kiểm tra thiết bị mới lạ
  if (userHistory && userHistory.length > 0) {
    const knownDevices = userHistory.map(h => h.device_fingerprint);
    const currentFingerprint = generateDeviceFingerprint(deviceInfo);
    
    if (!knownDevices.includes(currentFingerprint)) {
      suspicious.isSuspicious = true;
      suspicious.reasons.push('Thiết bị mới chưa từng sử dụng');
    }
  }

  // Kiểm tra thời gian đăng nhập bất thường
  const now = new Date();
  const hour = now.getHours();
  if (hour < 6 || hour > 23) {
    suspicious.isSuspicious = true;
    suspicious.reasons.push('Đăng nhập vào giờ bất thường');
  }

  return suspicious;
}

// Format thông tin thiết bị để hiển thị
function formatDeviceInfo(deviceInfo) {
  return {
    browser: `${deviceInfo.browser.name} ${deviceInfo.browser.version}`,
    os: `${deviceInfo.os.name} ${deviceInfo.os.version}`,
    device: `${deviceInfo.device.type} - ${deviceInfo.device.model}`,
    language: deviceInfo.acceptLanguage,
    screen: deviceInfo.screen || 'Unknown',
    timezone: deviceInfo.timezone || 'Unknown'
  };
}

// Thu thập thông tin IP và địa lý
async function getIpInfo(ip) {
  try {
    // Sử dụng ipapi.co để lấy thông tin địa lý (miễn phí)
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    if (response.ok) {
      const data = await response.json();
      return {
        ipAddress: ip,
        country: data.country_name,
        countryCode: data.country_code,
        region: data.region,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        isp: data.org,
        org: data.org
      };
    }
  } catch (error) {
    console.error('Lỗi khi lấy thông tin IP:', error);
  }
  
  return {
    ipAddress: ip || 'Unknown',
    country: 'Unknown',
    countryCode: 'Unknown',
    region: 'Unknown',
    city: 'Unknown',
    latitude: null,
    longitude: null,
    timezone: 'Unknown',
    isp: 'Unknown',
    org: 'Unknown'
  };
}

export {
  parseUserAgent,
  collectDeviceInfo,
  generateDeviceFingerprint,
  detectSuspiciousActivity,
  formatDeviceInfo,
  getIpInfo
}; 