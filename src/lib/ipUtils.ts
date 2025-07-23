import { logger } from "./logger";

/**
 * Attempts to get the user's actual IP address using various methods
 * Falls back to localhost if unable to determine
 */
export const getUserIpAddress = async (): Promise<string> => {
  try {
    // Try multiple IP detection services
    const ipServices = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://httpbin.org/ip',
    ];

    for (const service of ipServices) {
      try {
        const response = await fetch(service, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(3000),
        });

        if (response.ok) {
          const data = await response.json();
          
          // Different services return IP in different formats
          const ip = data.ip || data.query || data.origin?.split(' ')[0];
          
          if (ip && isValidIP(ip)) {
            return ip;
          }
        }
      } catch (error) {
        // Continue to next service if this one fails
        continue;
      }
    }

    // If all services fail, try WebRTC method (works for local network IP)
    const webRtcIp = await getWebRTCIP();
    if (webRtcIp && isValidIP(webRtcIp)) {
      return webRtcIp;
    }

  } catch (error) {
    logger.error('Error getting IP address', error);
  }

  // Fallback to localhost
  return '127.0.0.1';
};

/**
 * Validates if a string is a valid IPv4 or IPv6 address
 */
const isValidIP = (ip: string): boolean => {
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

/**
 * Attempts to get IP using WebRTC (gets local network IP)
 */
const getWebRTCIP = (): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      pc.createDataChannel('');

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const ipMatch = candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
          
          if (ipMatch) {
            const ip = ipMatch[0];
            if (ip && !ip.startsWith('127.') && !ip.startsWith('0.')) {
              pc.close();
              resolve(ip);
              return;
            }
          }
        }
      };

      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(() => resolve(null));

      // Timeout after 2 seconds
      setTimeout(() => {
        pc.close();
        resolve(null);
      }, 2000);

    } catch (error) {
      resolve(null);
    }
  });
};