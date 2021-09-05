import { reactive } from "vue";
import { events } from "./events";

export function useBlockDragger(focusData, lastSelectBlock, data){
    let dragState = {
        startX: 0, // 记录鼠标的X方向的距离
        startY: 0, // 记录鼠标的Y方向的距离
        dragging: false, // 表示是否处于拖动中
    };

    // 将辅助线的位置变为响应式的
    let markLine = reactive({
        x: null,
        y: null
    })
    const mousemove = (e) => {
        let { clientX: moveX, clientY: moveY } = e;

        if(!dragState.dragging){
            dragState.dragging = true;
            events.emit('dragstart');
        }

        // 计算出当前选中元素最新的left 和 top 值
        let left = moveX - dragState.startX + dragState.startLeft;
        let top = moveY - dragState.startY + dragState.startTop;

        // 先计算横线 距离参照物元素还有5像素的时候， 就显示这根线
        // x, y 用于匹配辅助线实际的显示位置， 如果匹配不到还有清空原来辅助线的作用
        let x = null;
        let y = null;
        for(let i = 0; i < dragState.lines.y.length; i++){
            const { top: t, showTop: s } = dragState.lines.y[i];
            if(Math.abs(t - top) < 5){
                y = s;// 线展示的实际位置
                moveY = dragState.startY + t - dragState.startTop; // 实现元素的快速贴合
                // 和下边的逻辑结和， moveY 就是 t - dragState.startTop
                break; // 找到一根线后就跳出循环
            }
        }
        for(let i = 0; i < dragState.lines.x.length; i++){
            const { left: l, showLeft: s } = dragState.lines.x[i];
            if(Math.abs(l - left) < 5){
                x = s;// 线展示的实际位置
                moveX = dragState.startX + l - dragState.startLeft; // 实现元素的快速贴合
                // 和下边的逻辑结和， moveY 就是 t - dragState.startTop
                break; // 找到一根线后就跳出循环
            }
        }

        markLine.x = x;
        markLine.y = y;

        // 获取移动的距离
        let durX = moveX - dragState.startX;
        let durY = moveY - dragState.startY;

        focusData.value.focus.forEach((block, index) => {
            block.top = dragState.startPos[index].top + durY;
            block.left = dragState.startPos[index].left + durX;
        });
    }

    const mouseup = (e) => {
        document.removeEventListener('mousemove', mousemove);
        document.removeEventListener('mouseup', mouseup);

        // 清空辅助线
        markLine.x = null;
        markLine.y = null;

        if(dragState.dragging){
            dragState.dragging = false;
            events.emit('dragend');
        }
    }

    const mousedown = (e) => {
        const { width: BWidth, height: BHeight } = lastSelectBlock.value; // 最后一个选中节点的宽高

        dragState = {
            dragging: false,
            startX: e.clientX,
            startY: e.clientY,
            startLeft: lastSelectBlock.value.left,
            startTop: lastSelectBlock.value.top, // B开始拖拽前的位置
            startPos: focusData.value.focus.map(({top, left}) => ({top, left})), //记录开始时所有选中的节点的位置
            lines: (() => {
                const { unfocused } = focusData.value; // 获取其他没有选中的节点以他们的位置做辅助线

                let lines = { x: [], y: [] }; // 横线的位置用y来存储， 纵线的位置使用x来存储
                [
                    ...unfocused,
                    {
                        top: 0,
                        left: 0,
                        width: data.value.container.width,
                        height: data.value.container.height,
                    }, // 把整个容器添加进对齐元素
                ].forEach((block) => {
                    const { top: ATop, left: ALeft, width: AWidth, height: AHeight } = block;
                    // 辅助线x,y两个方向个有5中情况显示辅助线， 以y方向为例：
                    // 底对顶、顶对顶、中间对中间、底对底、顶对底 （ B 相对与 A ）
                    // 1. 顶对顶
                    lines.y.push({ showTop: ATop, top: ATop }); // showTop 表示辅助线显示的位置、top表示最后选中节点需到的top值
                    // 2. 底对顶
                    lines.y.push({ showTop: ATop, top: ATop - BHeight });
                    // 3. 中间对中间
                    lines.y.push({ showTop: ATop + AHeight / 2, top: ATop + AHeight / 2 - BHeight / 2 });
                    // 4. 顶对底
                    lines.y.push({ showTop: ATop + AHeight, top: ATop + AHeight});
                    // 5. 底对底
                    lines.y.push({ showTop: ATop + AHeight, top: ATop + AHeight - BHeight});

                    // 1. 左对左
                    lines.x.push({ showLeft: ALeft, left: ALeft });
                    // 2. 右对左
                    lines.x.push({ showLeft: ALeft, left: ALeft - BWidth});
                    // 3. 中间对中间
                    lines.x.push({ showLeft: ALeft + AWidth / 2, left: ALeft + AWidth / 2 - BWidth / 2});
                    // 4. 左对右
                    lines.x.push({ showLeft: ALeft + AWidth, left: ALeft + AWidth});
                    // 5. 右对右
                    lines.x.push({ showLeft: ALeft + AWidth, left: ALeft + AWidth - BWidth});
                });

                return lines;
            })()
        }
        // 绑定鼠标事件
        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseup', mouseup);
    }

    return {
        mousedown,
        markLine
    }
}