function getClientIp(req) {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        const ips = forwardedFor.split(',').map(ip => ip.trim());
        const publicIp = ips.find(ip => 
            !ip.startsWith('10.') && 
            !ip.startsWith('172.16.') && 
            !ip.startsWith('172.17.') && 
            !ip.startsWith('172.18.') && 
            !ip.startsWith('172.19.') && 
            !ip.startsWith('172.20.') && 
            !ip.startsWith('172.21.') && 
            !ip.startsWith('172.22.') && 
            !ip.startsWith('172.23.') && 
            !ip.startsWith('172.24.') && 
            !ip.startsWith('172.25.') && 
            !ip.startsWith('172.26.') && 
            !ip.startsWith('172.27.') && 
            !ip.startsWith('172.28.') && 
            !ip.startsWith('172.29.') && 
            !ip.startsWith('172.30.') && 
            !ip.startsWith('172.31.') && 
            !ip.startsWith('192.168.') &&
            ip !== '::1' &&
            ip !== '127.0.0.1'
        );
        if (publicIp) {
            return publicIp;
        }
    }
    
    const realIp = req.headers['x-real-ip'];
    if (realIp && realIp !== '::1' && realIp !== '127.0.0.1') {
        return realIp;
    }
    
    const remoteAddress = req.connection.remoteAddress || 
                          req.socket.remoteAddress || 
                          req.connection.socket.remoteAddress;
    
    if (remoteAddress && remoteAddress !== '::1' && remoteAddress !== '127.0.0.1') {
        return remoteAddress;
    }
    
    return 'Unknown';
}

module.exports = { getClientIp };