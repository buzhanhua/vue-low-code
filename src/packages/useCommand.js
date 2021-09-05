import deepcopy from "deepcopy";
import { nextTick, onUnmounted } from "vue";
import { events } from "./events";

export function useCommand(data, focusData){
    const state = {
        current: -1, // 前进后退的索引值
        queue: [], // 存放所有的操作
        commands: {}, //制作命令和执行功能的映射表
        commandArray: [], // 存放所有的命令
        destroyArray: [], //销毁队列
    }

    const registry = (command) => {
        state.commandArray.push(command);
        state.commands[command.name] = (...args) => {
            const { redo, undo } = command.execute(...args);
            redo();
            if(!command.pushQueue){ //如果不需要放在操作队列中， 直接return
                return;
            }
            let { queue, current } = state;

            // 如果先放了 组件1 -》 组件2 => 组件3 =》 组件4 - -又撤销到了 组件1， 在新增 组件3 ， 需要将撤销之后的干掉
            // 组件1 -> 组件3

            if(queue.length > 0){
                queue = queue.slice(0, current + 1);// 可能在放置的过程中有撤销操作，所以根据当前最新的current值来计算新的对了
                state.queue = queue;
            }

            queue.push({redo, undo});

            state.current = current + 1;
        }
    }

    registry({
        name: 'redo',
        label: '重做',
        keyboard: 'ctrl+y',
        execute() {
            // 方便扩展， 这里处理一些公用逻辑
            return {
                redo(){
                    let item = state.queue[state.current + 1]; // 找到下一步需要还原的操作
                    if(item){
                        item.redo && item.redo();
                        state.current++;
                    }
                }
            }
        }
    })

    registry({
        name: 'undo',
        label: '撤销',
        keyboard: 'ctrl+z',
        execute() {
            // 方便扩展， 这里处理一些公用逻辑
            return {
                redo(){
                    if(state.current == -1) return; // 退无可退， 没有需要撤销的逻辑
                    let item = state.queue[state.current];
                    if(item){
                        item.undo && item.undo();
                        state.current--;
                    }
                }
            }
        }
    });

    // 添加拖拽指令
    registry({
        name: 'drag',
        pushQueue: true, // 用于标识当前指令的操作是否放在操作队列中
        init() { // 初始化操作
            this.before = null;
            // 监控拖拽开始事件, 保存状态
            const start = () => this.before = deepcopy(data.value.blocks);
            // 监控结束事件， 执行拖拽指令
            const end = () => { state.commands.drag() }

            events.on('dragstart', start);
            events.on('dragend', end);

            // 返回销毁函数
            return () => {
                events.off('dragstart', start);
                events.off('dragend', end);
            }
        },
        execute(){
            // 保存新旧状态形成闭包
            let before = this.before;
            let after = data.value.blocks;
            return {
                redo() {
                    data.value = { ...data.value, blocks: after };
                },
                undo() {
                    data.value = { ...data.value, blocks: before };
                }
            }
        }
    });

    // 导入功能
    registry({
        name: 'updateContainer',
        pushQueue: true,
        execute(newValue) {
            let state = {
                before: data.value, // 当前值
                after: newValue, // 新值
            }
            return {
                redo: () => {
                    data.value = state.after;
                },
                undo: () => {
                    data.value = state.before;
                }
            }
        }
    });

    // 更新单个节点
    registry({
        name: 'updateBlock',
        pushQueue: true,
        execute(newBlock, oldBlock) {
            let state = {
                before: data.value.blocks,
                after: (() => {
                    let blocks = [...data.value.blocks];
                    const index = data.value.blocks.indexOf(oldBlock);
                    if(index > -1){
                        blocks.splice(index, 1, newBlock);
                    }
                    return deepcopy(blocks)
                })()
            }
            console.log(state.after);
            return {
                redo: () => {
                    data.value = { ...data.value, blocks: state.after };
                },
                undo: () => {
                    data.value = { ...data.value, blocks: state.before };
                }
            }
        }
    });

    // 置顶操作
    registry({
        name: 'placeTop',
        pushQueue: true,
        execute() {
            let before = deepcopy(data.value.blocks);
            let after = (() => {
                let { focus, unfocused } = focusData.value;

                let maxZIndex = unfocused.reduce((prev, block) => {
                    return Math.max(prev, block.zIndex);
                }, -Infinity);

                // 让每个选中的节点比未选中节点的层级大1
                focus.forEach((block) => block.zIndex = maxZIndex + 1);

                return data.value.blocks;
                // Infinity 表示无穷大的意思 -Infinity 表示负无穷大
            })()
            return {
                redo(){
                    data.value = { ...data.value, blocks: after }
                },
                undo(){
                    data.value = { ...data.value, blocks: before }
                }
            }
        }

    })
    

    // 置底操作
    registry({
        name: 'placeBottom',
        pushQueue: true,
        execute() {
            let before = deepcopy(data.value.blocks);
            let after = (() => {
                let { focus, unfocused } = focusData.value;

                let minZIndex = unfocused.reduce((prev, block) => {
                    return Math.min(prev, block.zIndex);
                }, Infinity) - 1;

                // 不能直接减一， 因为zIndex出现负值，组件就看不到了

                if(minZIndex < 0){
                    const dur = Math.abs(minZIndex);
                    minZIndex = 0;
                    unfocused.forEach((block) => block.zIndex += dur);
                }

                focus.forEach((block) => block.zIndex =  minZIndex);
                return data.value.blocks;
                // Infinity 表示无穷大的意思 -Infinity 表示负无穷大
            })()
            return {
                redo(){
                    data.value = { ...data.value, blocks: after }
                },
                undo(){
                    data.value = { ...data.value, blocks: before }
                }
            }
        }

    })


    // 删除操作
    registry({
        name: 'delete',
        pushQueue: true,
        keyboard: 'ctrl+delete',
        execute() {
            let state = {
                before : deepcopy(data.value.blocks),
                after : focusData.value.unfocused
            }
            return {
                redo(){
                    data.value = { ...data.value, blocks: state.after };
                },
                undo(){
                    data.value = { ...data.value, blocks: state.before }
                }
            }
        }

    })

    const keyboardEvent = (() => {
        const keyCodes = {
            90: 'z',
            89: 'y',
            8: 'delete'
        };
        const onKeyDown = (e) => {
            const { ctrlKey, keyCode } = e;
            let keyString = [];
            if(ctrlKey) keyString.push('ctrl');
            keyString.push(keyCodes[keyCode]);
            keyString = keyString.join('+');
            
            state.commandArray.forEach(({ keyboard, name }) => {
                if(!keyboard) return; // 没有键盘事件直接return
                if(keyboard === keyString){
                    state.commands[name]();
                    e.preventDefault(); // 取消默认事件
                }
            })
        }
        const init = () => { // 初始化事件
            window.addEventListener('keydown', onKeyDown);
            return () => { // 解绑事件
                window.removeEventListener('keydown', onKeyDown);
            }
        };
        return init;
    })();

    // 执行初始化逻辑
    (() => {
        state.destroyArray.push(keyboardEvent());
        state.commandArray.forEach((command) => command.init && state.destroyArray.push(command.init()));
    })();

    // 执行销毁逻辑
    onUnmounted(() => {
        state.destroyArray.forEach((fn) => fn && fn());
    })

    return state;
}