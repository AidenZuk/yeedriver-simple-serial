/**
 * Created by zhuqizhong on 17-8-25.
 */
const _ = require('lodash');
const EventEmitter = require('events');
const STATE=
    {
        "IDLE":0
    };
const TIMEOUT_DEF = 4;
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
class ClassFactory extends  EventEmitter{
    constructor(actuator){
        super();
        this.state = STATE.IDLE;
        this.timeout = TIMEOUT_DEF;
        this.preset_timeout = TIMEOUT_DEF;
        this.devices = {};
        this.actuator = actuator;
        this.actuator.on('data',(data)=>{
            this.OnData(data);
        })
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
    OnTick(){
        if(this.state !== STATE.IDLE){
            if(this.timeout > 0){
                this.timeout--;
                if(this.timeout === 0){
                    this.setState(STATE.IDLE);
                    this.timeout = this.preset_timeout;
                }
            }
        }
       _.each(this.devices,(device)=>{
           device.onTick();
       })
    }

    OnData(data){
        this.timeout = this.preset_timeout;
        throw new Error("DataParser must be implemented")
    }

    ReadWQ(devId,wq_no){
        if(this.devices && this.devices[devId]){
            return this.devices[devId].ReadWQ(wq_no);
        }else{
            console.error(`Simple Serial ClassFactory:${devId} not existed`);
        }
    }

    WriteWQ(devId,wq_no,value){
        if(this.devices && this.devices[devId]){
            return this.devices[devId].WriteWQ(wq_no,value);
        }else{
            console.error(`Simple Serial ClassFactory:${devId} not existed`);
            throw new Error(`Simple Serial ClassFactory:${devId} not existed`);
        }
    }
}

module.exports = ClassFactory;
