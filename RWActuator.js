/**
 * Created by zhuqizhong on 17-8-26.
 */
const _ = require('lodash');
const SerialPort = require('serialport');
const Net = require('net');
const Q = require('q');
const EventEmitter = require('events');
const JobQueue = require('qz-jobqueue').JobQueue;

class SerialWrapper extends EventEmitter {

    constructor() {
        super();
        this.m_serial = null;
    }

    CreateFromOption(options) {
        if(this.m_serial){
            this.m_serial.removeAllListeners('open');
            this.m_serial.removeAllListeners('data');
            this.m_serial.removeAllListeners('error');
            this.m_serial.removeAllListeners('end');
            this.m_serial.close();
            delete this.m_serial;
        }
        this.m_serial = new SerialPort(options.path, options.opts);
        this.m_serial.on('data', (data) => {
            console.log('data received:',data);
            this.emit('data', data);
        });
        this.m_serial.on('error', (data) => {
            this.emit('error', data);
        });
        this.m_serial.on('open', (data) => {
            this.emit('open', data);
        });
        this.m_serial.on('close', (data) => {
            this.emit('close', data);
        })
    }

    writeData(data) {
        this.m_serial && this.m_serial.write(data);
    }

    writeDataP(data) {
        return Q().then(() => {
            let defer = Q.defer();
            if(this.m_serial){
                this.m_serial.write(data,(error)=>{
                    if(error){
                        defer.reject(error);
                    }else{
                        defer.resolve();
                    }
                });

            }else{
                defer.reject('serial not initialised!');
            }
            return defer.promise;

        });
    }

    writeAndDrainP(data) {
        return Q().then(() => {
            let defer = Q.defer();
            if(this.m_serial){
                this.m_serial.write(data);
                this.m_serial.drain((error)=>{
                    if(error){
                        defer.reject(error);
                    }else{
                        defer.resolve();
                    }
                });

            }else{
                defer.reject('serial not initialised!');
            }
            return defer.promise;

        });
    }
    close(){
        this.m_serial && this.m_serial.close();
    }
    open(){
        this.m_serial && this.m_serial.open();
    }
}


class TCPClientWrapper extends EventEmitter {

    constructor() {
        super();
        this.m_serial = null;

    }


    release(){
        if(this.m_serial){
            this.m_serial.removeAllListeners('open');
            this.m_serial.removeAllListeners('data');
            this.m_serial.removeAllListeners('error');
            this.m_serial.removeAllListeners('end');
            this.m_serial.end();
            delete this.m_serial;
        }
    }

    CreateFromOption(options) {

        this.release();
        this.ip = options.ip;
        this.port = options.port;

    }

    writeData(data) {
        this.m_serial && this.m_serial.write(data);
    }

    writeDataP(data) {
        return Q().then(() => {
            let defer = Q.defer();
            if(this.m_serial){
                this.m_serial.write(data,(error)=>{
                    if(error){
                        defer.reject(error);
                    }else{
                        defer.resolve();
                    }
                });

            }else{
                defer.reject('serial not initialised!');
            }
            return defer.promise;

        });
    }

    writeAndDrainP(data) {
        return Q().then(() => {
            let defer = Q.defer();
            if(this.m_serial){
                if(this.m_serial.write(data)){
                    defer.resolve();
                }else{
                    this.m_serial.once('drain',(error)=>{
                        if(error){
                            defer.reject(error);
                        }else{
                            defer.resolve();
                        }
                    });

                }

            }else{
                defer.reject('serial not initialised!');
            }
            return defer.promise;

        });
    }
    open(){
        this.m_serial  = Net.createConnection(this.port,this.ip, () => {
            // 'connect' listener
            this.emit('open', {});
        });
        this.m_serial.on('data', (data) => {
            this.emit('data', data);
        });
        this.m_serial.on('error', (data) => {
            this.emit('error', data);
        });
        this.m_serial.on('connect', (data) => {
            this.emit('open', data);
        });
        this.m_serial.on('end', (data) => {
            this.emit('close', data);
        });
        this.m_serial.on('close', (data) => {
            this.emit('close', data);
        })
    }
    close(){
       this.release();
    }
}
const SerialState = {
    IDLE: 0,
    OPENING: 1,
    WORKING: 2,
    CLOSING: 3
};
/********************************************
 *               IDLE                   OPENING                     WORKING                 CLOSING
 * open         this.open=true          this.open=true          this.open=true              this.open=true
 *              enterState(OPENING)
 * close        this.open=false         this.open=false             this.open=false             this.open=false
 *                                      enterState(OPENING)         enterState(OPENING)
 * evt 'open'                            enterState('WORKING')
 * port evt 'error'                          enterState(CLOSING)         enterState(CLOSING)
 * port evt 'close'                           enterState(IDLE)            enterState(IDLE)      enterState(IDLE)
 * port evt 'write'
 * evt 'timeout'   checkReconnect           enterState(IDLE);                                enterState(IDLE);
 *******************************************/
class RWActuator extends EventEmitter {
    constructor(workType) {
        super();
        this.open = false;
        this.state = SerialState.IDLE;
        this.pending = [];
        this.type = workType; // serial,client,server, default is serial
        this.on('timeout', () => {
            switch (this.state) {
                case SerialState.IDLE:
                    this.checkReconnect();
                    break;
                case SerialState.OPENING:
                    console.error('open failed:');
                    this.enterState(SerialState.IDLE);
                    break;
                case SerialState.WORKING:

                    this.setTimer(0);
                    break;
                case SerialState.CLOSING:
                    console.error('close failed:');
                    this.enterState(SerialState.IDLE);
                    break;
            }
        });

        this.queue = new JobQueue({comsumer:this.writer.bind(this)});
        this.queue.pause();

    }

    writer(data){
        //总是在可以写的时候才会被调用
        if(data.waitDrain){
            return this.writeDrainP(data.data,data.timeout);
        }else{
            return this.writeP(data.data,data.timeout);
        }
    }
    checkReconnect() {
        if (this.open && this.mSerial) {
            this.enterState(SerialState.OPENING);
            this.mSerial.open();

        }
    }

    setTimer(ms) {
        if (this.timeHandler) {
            clearTimeout(this.timeHandler);
            this.timeHandler = null;
        }
        if (ms) {
            this.timeHandler = setTimeout(() => {
                this.emit('timeout');
            }, ms);
        }

    }

    enterState(newState) {
        this.state = newState;
        switch (newState) {
            case SerialState.IDLE:
                this.queue.pause();
                this.setTimer(1000);
                break;
            case SerialState.OPENING:
                this.queue.pause();
                this.setTimer(2000);
                break;
            case SerialState.WORKING:
                this.queue.resume();
                this.setTimer(0);
                break;
            case SerialState.CLOSING:
                this.queue.pause();
                this.setTimer(1000);
                break;
        }
    }

    setConfig(options) {
        if (!_.isEqual(this.portOptions, options)) {
            this.portOptions = _.cloneDeep(options || {});
            this.portOptions.opts = this.portOptions.opts || {};
            this.portOptions.opts.autoOpen = false;
            if (this.mSerial) {
                this.mSerial.close();
                this.enterState(SerialState.CLOSING);
            } else {
                switch(this.type){

                    case 'client':
                        this.mSerial = new TCPClientWrapper();
                        break;
                    case 'server':
                        break;
                    default:
                        this.mSerial = new SerialWrapper();
                        break;
                }

                this.mSerial.CreateFromOption(this.portOptions);
                this.mSerial.on('close', (err) => {
                    switch (this.state) {
                        case SerialState.IDLE:

                            console.error('received close in IDLE!');
                            break;
                        case SerialState.OPENING:

                            this.enterState(SerialState.IDLE);
                            break;
                        case SerialState.WORKING:

                            this.enterState(SerialState.IDLE);
                            break;
                        case SerialState.CLOSING:
                            this.enterState(SerialState.IDLE);
                            break;
                    }
                });
                this.mSerial.on('error', (error) => {
                    switch (this.state) {
                        case SerialState.IDLE:

                            console.error('received error in IDLE!');
                            break;
                        case SerialState.OPENING:
                            this.mSerial.close();
                            this.enterState(SerialState.CLOSING);
                            break;
                        case SerialState.WORKING:
                            this.mSerial.close();
                            this.enterState(SerialState.CLOSING);
                            break;
                        case SerialState.CLOSING:
                            //       console.error('received open in Closing!');
                            break;
                    }
                });
                this.mSerial.on('open', () => {
                    switch (this.state) {
                        case SerialState.IDLE:
                            this.mSerial.close();
                            this.enterState(SerialState.CLOSING);
                            console.error('received open in IDLE!');
                            break;
                        case SerialState.OPENING:
                            this.enterState(SerialState.WORKING);
                            break;
                        case SerialState.WORKING:
                            console.error('received open in WORK!');
                            break;
                        case SerialState.CLOSING:
                            console.error('received open in Closing!');
                            break;
                    }
                })
                this.mSerial.on('data', (data) => {
                    this.emit('data',data);
                })
            }
        }

    }

    start() {
        this.open = true;
        this.enterState(SerialState.OPENING);
        this.mSerial && this.mSerial.open();
    }

    stop() {
        this.open = false;
        if (this.state === SerialState.OPENING || this.state === SerialState.WORKING) {
            this.mSerial && this.mSerial.close();
            this.enterState(SerialState.CLOSING);
        }

    }


    _close() {

        return Q().then(() => {
            this.closing = true;
            if (this.mSerial) {
                this.mSerial.close();
            }
        })
    }

    write(data,timeout) {

        this.queue.push({data:data,
            timeout:timeout});
    }

    _writeWithPromise(data, waitDrain, timeout) {
        timeout = timeout || 10000;
        return this.queue.push({
            data: data,
            waitDrain: waitDrain,
            timeout:timeout
        },timeout);

    }

    writeP(data, timeout) {
        return this._writeWithPromise(data, false, timeout);
    }

    writeDrainP(data, timeout) {
        return this._writeWithPromise(data, true, timeout);
    }
}

module.exports = RWActuator;