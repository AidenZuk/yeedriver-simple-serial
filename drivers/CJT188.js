/**
 * Created by zhuqizhong on 17-8-25.
 */
const ClassFactory = require('./ClassFactory');
const DevBase = require('./DevBase')
const util = require('./util_func');
const DL_STATE = {
    WAIT_START: 0,
    GET_TYPE: 1,
    GET_ADDRESS: 2,
    WAIT_CTRL: 3,
    WAIT_LEN: 4,
    GET_DATA: 5,
    WAIT_CS: 6,
    WAIT_END: 7
};
const TAGS={
    START:0x68,
    END:0x16
}

const TLWQ = {
    TOTAL:1,
    FLOW:2,
    BATTERY:3,
    UNDERVOLTAGE:4
};
class TLMeter extends  DevBase{
    constructor(devId){
        super(devId);
        this.F = undefined;
        this.T = undefined;
        this.bat = undefined;
        this.uv = undefined;
    }

    /**
     * 更新相应的内容，返回数据变化的寄存器编号
     * @param newData
     * @returns {Array}
     */
    updateValue(newData){
        let updateRegs =[];
        if(this.F !== newData.F){
            updateRegs.push(TLWQ.FLOW);
            this.F = newData.F;
        }
        if(this.T !== newData.T){
            updateRegs.push(TLWQ.TOTAL);
            this.T = newData.T;
        }
        if(this.bat !== newData.B){
            updateRegs.push(TLWQ.BATTERY);
            this.bat = newData.B;
        }
        if(this.uv !== newData.U){
            updateRegs.push(TLWQ.UNDERVOLTAGE);
            this.uv = newData.U;
        }
        return updateRegs;
    }

    ReadWQ(wq_no){
        switch (wq_no){
            case TLWQ.TOTAL:
                return this.T;
                break;
            case TLWQ.FLOW:
                return this.F;

                break;
            case TLWQ.BATTERY:
                return this.bat;
                break;
            case TLWQ.UNDERVOLTAGE:
                return this.uv;
                break;
        }
    }
    WriteWQ(wq_no,value){
        return Q();
    }
}
class CJT188Manager extends ClassFactory{
    constructor(devId){
        super(devId);
        this.cur_pos = 0;
        this.address = [];
        this.cs_sum = 0x68;
        this.type = undefined;
        this.devices = {};
    }

    createDevice(devId){

        this.devices[devId] = new TLMeter(devId);
    }

    parseDataField(data_field){
        if(data_field[0] === 0x90 && data_field[1] === 0x22){

            let flow  = util.convertFromBCD(data_field,2,4,4);
            let total = util.convertFromBCD(data_field,6,4,4);
            let volt = (data_field[10]/0.1).toFixed(1);
            let under = !!(data_field[11] & 0x04);

            return {F:flow,T:total,B:volt,U:under};

        }else{
            return {}
        }
    }
    OnNewFrame(frameInfo){
        console.log('new data:',JSON.stringify(frameInfo));
        let addr = util.convAddr[frameInfo.address];
        if(!this.devices[addr]){
            this.devices[addr] = new TLMeter(addr);
        }

        let regs = this.devices[addr].updateValue(this.parseDataField(frameInfo.data));
        for(let i = 0; i < regs && regs.length;i++){
            this.emit('regChanged',{devId:addr,memTag:'WQ',memId:regs[i]});
        }
    }
    OnData(data){
        function processByte(oneByte) {
            switch (this.state) {
                case DL_STATE.WAIT_START:
                    if (oneByte === TAGS.START) {
                        this.state = DL_STATE.GET_TYPE;
                        this.cur_pos = 0;
                        this.address = [];
                        this.cs_sum = 0x68;
                    }
                    break;
                case DL_STATE.GET_TYPE:
                    this.cs_sum += oneByte;
                    this.type= oneByte;
                    this.state = DL_STATE.GET_ADDRESS;
                    break;
                case DL_STATE.GET_ADDRESS:
                    this.cs_sum += oneByte;
                    this.address.push(oneByte);
                    this.cur_pos++;
                    if (this.cur_pos >= 7) {
                        this.state = DL_STATE.WAIT_CTRL;
                    }
                    break;
                case DL_STATE.WAIT_CTRL:
                    this.cs_sum += oneByte;
                    this.ctrlId = oneByte;
                    this.state = DL_STATE.WAIT_LEN;
                    break;
                case DL_STATE.WAIT_LEN:
                    this.cs_sum += oneByte;
                    this.data_len = oneByte;
                    this.data = [];
                    this.cur_pos = 0;
                    this.state = DL_STATE.GET_DATA;
                    break;
                case DL_STATE.GET_DATA:
                    this.cs_sum += (oneByte);
                    this.data.push(oneByte);
                    this.cur_pos++;
                    if (this.cur_pos >= this.data_len) {
                        this.state = DL_STATE.WAIT_CS;
                    }
                    break;
                case DL_STATE.WAIT_CS:
                    if (oneByte === (this.cs_sum & 0xFF)) {
                        this.state = DL_STATE.WAIT_END;
                    } else {
                        if (oneByte === TAGS.START) {
                            this.state = DL_STATE.GET_ADDRESS;
                        } else {
                            this.state = DL_STATE.WAIT_START;
                        }
                    }
                    break;
                case DL_STATE.WAIT_END:
                    if (oneByte === TAGS.END) {
                        this.OnNewFrame({type:this.type,ctrlId: this.ctrlId, address: this.address, data: this.data} );
                        this.state = DL_STATE.WAIT_START;
                    } else {
                        if (oneByte === TAGS.START) {
                            this.state = DL_STATE.GET_ADDRESS;
                        } else {
                            this.state = DL_STATE.WAIT_START;
                        }
                    }
                    break;
            }
        }

        for (let i = 0; i < data.length; i++) {
            processByte.call(this, data.readUInt8(i));
        }
    }


}

module.exports = CJT188Manager;