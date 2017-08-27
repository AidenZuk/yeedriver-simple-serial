/**
 * Created by zhuqizhong on 17-8-27.
 */
const TIMEOUT_DEF = 4;
const STATE=
    {
        "IDLE":0
    };
/**
 *
 * 基类，处理超时事件
 *
 * 继承类里，需要重写WriteWQ/ReadWQ等函数
 *
 * 继承类里，如果需要，可以重·写setState函数，实现状态变化时的某些动作
 *
 * 继承类里，总是要实现OnData函数
 *
 */
class DevBase{
    constructor(devId){
        this.state = STATE.IDLE;
        this.timeout = TIMEOUT_DEF;
        this.preset_timeout = TIMEOUT_DEF;
        this.devices = {};
    }

    /**
     * 设置超时时间，超过多少时间没有数据，状态自动回0,默认200ms
     * @param timeout  超时时间，以100ms为单位
     */
    setTimeout(timeout){
        this.preset_timeout = timeout*2;
    }


    setState(newState){
        this.state = newState;
    }
    onTick(){

    }



    CreateClass(devId){
        throw new Error("createClass must be implemented");
    }
    ReadWQ(wq_no){
        throw new Error("readWQ must be implemented");
    }

    WriteWQ(wq_no){
        throw new Error("WriteWQ must be implemented")
    }

    updateWQ(wq_no,value){

    }
}

module.exports = DevBase;