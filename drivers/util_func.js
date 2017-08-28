/**
 * Created by zhuqizhong on 17-8-27.
 */
/**
 * 数组到实际值的转换
 * @param buffer       待转换的bcd码数据, 低字节在前
 * @param total_len    总共多少字节
 * @param dec_len      倍数
 * @returns {number}
 */
function convertFromBCD(buffer, offset, total_len, dec_len) {
    let multi = 1;
    let total = 0;
    for (let i = 0; i < total_len; i++) {
        let temp = (buffer[offset + i] & 0xF) + (buffer[offset + i] >> 4) * 10;
        total += temp * multi;
        multi *= 100;
    }
    return total / (dec_len);
}

module.exports.convertFromBCD = convertFromBCD;


function convertFromBCDInv(buffer, offset, total_len, dec_len) {
    let multi = 1;
    let total = 0;
    for (let i = total_len-1; i >=0; i--) {
        let temp = parseInt((buffer[offset + i] & 0xF) + (buffer[offset + i] >> 4) * 10);
        total += temp * multi;
        multi *= 100;
    }
    return total / (dec_len);
}

module.exports.convertFromBCDInv = convertFromBCDInv;
function ConvAddr(addr_buffer){
    let addr_str="";
    for(let i = 0; i < addr_buffer.length;i++){
        addr_str += ("00"+addr_buffer[i].toString(16)).substr(-2);
    }
    return addr_str;
}

module.exports.convAddr = ConvAddr;