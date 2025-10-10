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
  const uaOriginal = userAgent;

  // Detect Browser - Thứ tự quan trọng (kiểm tra cụ thể trước)
  let browser = { name: 'Unknown', version: 'Unknown' };

  if (ua.includes('edg/')) {
    browser.name = 'Edge';
    const match = ua.match(/edg\/(\d+\.\d+)/);
    if (match) browser.version = match[1];
  } else if (ua.includes('opr/') || ua.includes('opera/')) {
    browser.name = 'Opera';
    const match = ua.match(/(?:opr|opera)\/(\d+\.\d+)/);
    if (match) browser.version = match[1];
  } else if (ua.includes('chrome/') && !ua.includes('edg')) {
    browser.name = 'Chrome';
    const match = ua.match(/chrome\/(\d+\.\d+)/);
    if (match) browser.version = match[1];
  } else if (ua.includes('firefox/')) {
    browser.name = 'Firefox';
    const match = ua.match(/firefox\/(\d+\.\d+)/);
    if (match) browser.version = match[1];
  } else if (ua.includes('safari/') && !ua.includes('chrome')) {
    browser.name = 'Safari';
    const match = ua.match(/version\/(\d+\.\d+)/);
    if (match) browser.version = match[1];
  } else if (ua.includes('msie') || ua.includes('trident/')) {
    browser.name = 'Internet Explorer';
    const match = ua.match(/(?:msie |rv:)(\d+\.\d+)/);
    if (match) browser.version = match[1];
  } else if (ua.includes('coc_coc_browser')) {
    browser.name = 'Cốc Cốc';
    const match = ua.match(/coc_coc_browser\/(\d+\.\d+)/);
    if (match) browser.version = match[1];
  }

  // Detect OS
  let os = { name: 'Unknown', version: 'Unknown' };

  if (ua.includes('windows')) {
    os.name = 'Windows';
    if (ua.includes('windows nt 10.0')) os.version = '10/11';
    else if (ua.includes('windows nt 6.3')) os.version = '8.1';
    else if (ua.includes('windows nt 6.2')) os.version = '8';
    else if (ua.includes('windows nt 6.1')) os.version = '7';
    else if (ua.includes('windows nt 6.0')) os.version = 'Vista';
    else if (ua.includes('windows nt 5.1')) os.version = 'XP';
  } else if (ua.includes('mac os x') || ua.includes('macintosh')) {
    os.name = 'macOS';
    const match = ua.match(/mac os x (\d+[._]\d+(?:[._]\d+)?)/);
    if (match) os.version = match[1].replace(/_/g, '.');
  } else if (ua.includes('android')) {
    os.name = 'Android';
    const match = ua.match(/android (\d+(?:\.\d+)?)/);
    if (match) os.version = match[1];
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os.name = 'iOS';
    const match = ua.match(/os (\d+[._]\d+(?:[._]\d+)?)/);
    if (match) os.version = match[1].replace(/_/g, '.');
  } else if (ua.includes('linux')) {
    os.name = 'Linux';
    if (ua.includes('ubuntu')) os.version = 'Ubuntu';
    else if (ua.includes('debian')) os.version = 'Debian';
    else if (ua.includes('centos')) os.version = 'CentOS';
    else if (ua.includes('fedora')) os.version = 'Fedora';
    else if (ua.includes('arch')) os.version = 'Arch';
  } else if (ua.includes('cros')) {
    os.name = 'Chrome OS';
  }

  // Detect Device Type và Model
  let device = { type: 'desktop', model: 'Unknown', vendor: 'Unknown' };

  // iPad
  if (ua.includes('ipad')) {
    device.type = 'tablet';
    device.model = 'iPad';
    device.vendor = 'Apple';

    // Detect iPad model
    if (ua.includes('ipad pro')) device.model = 'iPad Pro';
    else if (ua.includes('ipad air')) device.model = 'iPad Air';
    else if (ua.includes('ipad mini')) device.model = 'iPad Mini';
  }
  // iPhone
  else if (ua.includes('iphone')) {
    device.type = 'mobile';
    device.model = 'iPhone';
    device.vendor = 'Apple';

    // Detect iPhone model từ screen size hoặc version
    const match = ua.match(/iphone os (\d+)/);
    if (match) {
      device.model = `iPhone (iOS ${match[1]})`;
    }
  }
  // iPod
  else if (ua.includes('ipod')) {
    device.type = 'mobile';
    device.model = 'iPod Touch';
    device.vendor = 'Apple';
  }
  // Android devices
  else if (ua.includes('android')) {
    device.vendor = 'Android';

    // Xác định type
    if (ua.includes('mobile')) {
      device.type = 'mobile';
    } else {
      device.type = 'tablet';
    }

    // Detect Android device model và vendor
    const modelMatch = uaOriginal.match(/\(Linux;.*?Android.*?;\s*([^)]+)\)/i);
    if (modelMatch) {
      let modelStr = modelMatch[1].trim();

      // Loại bỏ các keyword không cần thiết
      modelStr = modelStr.replace(/Build\/.*/i, '').trim();
      modelStr = modelStr.split(';').pop().trim();

      device.model = modelStr;

      // Detect vendor
      const lowerModel = modelStr.toLowerCase();
      if (lowerModel.includes('samsung')) device.vendor = 'Samsung';
      else if (lowerModel.includes('sm-')) device.vendor = 'Samsung';
      else if (lowerModel.includes('xiaomi') || lowerModel.includes('redmi') || lowerModel.includes('poco')) device.vendor = 'Xiaomi';
      else if (lowerModel.includes('oppo')) device.vendor = 'OPPO';
      else if (lowerModel.includes('vivo')) device.vendor = 'Vivo';
      else if (lowerModel.includes('huawei') || lowerModel.includes('honor')) device.vendor = 'Huawei';
      else if (lowerModel.includes('nokia')) device.vendor = 'Nokia';
      else if (lowerModel.includes('sony')) device.vendor = 'Sony';
      else if (lowerModel.includes('lg')) device.vendor = 'LG';
      else if (lowerModel.includes('htc')) device.vendor = 'HTC';
      else if (lowerModel.includes('motorola') || lowerModel.includes('moto')) device.vendor = 'Motorola';
      else if (lowerModel.includes('asus')) device.vendor = 'ASUS';
      else if (lowerModel.includes('lenovo')) device.vendor = 'Lenovo';
      else if (lowerModel.includes('realme')) device.vendor = 'Realme';
      else if (lowerModel.includes('oneplus')) device.vendor = 'OnePlus';
    }
  }
  // Windows Phone
  else if (ua.includes('windows phone')) {
    device.type = 'mobile';
    device.model = 'Windows Phone';
    device.vendor = 'Microsoft';
  }
  // Desktop/Laptop
  else if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
    device.type = 'desktop';

    if (ua.includes('macintosh')) {
      device.vendor = 'Apple';
      device.model = 'Mac';
    } else if (ua.includes('windows')) {
      device.vendor = 'PC';
      device.model = 'Windows PC';
    } else if (ua.includes('linux')) {
      device.vendor = 'PC';
      device.model = 'Linux PC';
    }
  }
  // Smart TV
  else if (ua.includes('smart-tv') || ua.includes('smarttv') || ua.includes('tv')) {
    device.type = 'tv';
    device.model = 'Smart TV';
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
  const deviceStr = deviceInfo.device.vendor !== 'Unknown' && deviceInfo.device.vendor !== deviceInfo.device.model
    ? `${deviceInfo.device.vendor} ${deviceInfo.device.model}`
    : deviceInfo.device.model;

  return {
    browser: `${deviceInfo.browser.name} ${deviceInfo.browser.version}`,
    os: `${deviceInfo.os.name} ${deviceInfo.os.version}`,
    device: `${deviceInfo.device.type} - ${deviceStr}`,
    deviceType: deviceInfo.device.type,
    deviceModel: deviceStr,
    deviceVendor: deviceInfo.device.vendor,
    language: deviceInfo.acceptLanguage,
    screen: deviceInfo.screen || 'Unknown',
    timezone: deviceInfo.timezone || 'Unknown'
  };
}

// Thu thập thông tin IP và địa lý với fallback APIs
async function getIpInfo(ip) {
  // Nếu là localhost hoặc private IP
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return {
      ipAddress: ip || 'Unknown',
      country: 'Local',
      countryCode: 'LOCAL',
      region: 'Local Network',
      city: 'Localhost',
      latitude: null,
      longitude: null,
      timezone: 'Local',
      isp: 'Local Network',
      org: 'Local Network'
    };
  }

  // Danh sách các API để thử (theo thứ tự ưu tiên)
  const apis = [
    {
      name: 'ipapi.co',
      url: `https://ipapi.co/${ip}/json/`,
      parser: (data) => ({
        ipAddress: ip,
        country: data.country_name || 'Unknown',
        countryCode: data.country_code || 'Unknown',
        region: data.region || 'Unknown',
        city: data.city || 'Unknown',
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        timezone: data.timezone || 'Unknown',
        isp: data.org || 'Unknown',
        org: data.org || 'Unknown'
      })
    },
    {
      name: 'ip-api.com',
      url: `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org`,
      parser: (data) => ({
        ipAddress: ip,
        country: data.country || 'Unknown',
        countryCode: data.countryCode || 'Unknown',
        region: data.regionName || 'Unknown',
        city: data.city || 'Unknown',
        latitude: data.lat || null,
        longitude: data.lon || null,
        timezone: data.timezone || 'Unknown',
        isp: data.isp || 'Unknown',
        org: data.org || 'Unknown'
      })
    },
    {
      name: 'ipinfo.io',
      url: `https://ipinfo.io/${ip}/json`,
      parser: (data) => {
        const [lat, lon] = (data.loc || ',').split(',');
        return {
          ipAddress: ip,
          country: data.country || 'Unknown',
          countryCode: data.country || 'Unknown',
          region: data.region || 'Unknown',
          city: data.city || 'Unknown',
          latitude: lat ? parseFloat(lat) : null,
          longitude: lon ? parseFloat(lon) : null,
          timezone: data.timezone || 'Unknown',
          isp: data.org || 'Unknown',
          org: data.org || 'Unknown'
        };
      }
    }
  ];

  // Thử từng API cho đến khi có kết quả
  for (const api of apis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(api.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'KD-App/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        // Kiểm tra nếu API trả về lỗi
        if (data.error || data.status === 'fail') {
          console.warn(`${api.name} returned error for IP ${ip}:`, data.message || data.error);
          continue;
        }

        const result = api.parser(data);
        console.log(`✅ Successfully got IP info from ${api.name} for ${ip}`);
        return result;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`${api.name} timeout for IP ${ip}`);
      } else {
        console.warn(`${api.name} error for IP ${ip}:`, error.message);
      }
      // Tiếp tục thử API tiếp theo
    }
  }

  // Nếu tất cả APIs đều thất bại
  console.error(`❌ All geolocation APIs failed for IP ${ip}`);
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