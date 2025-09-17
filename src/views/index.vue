<template>
  <div class="container">
    <div class="list">
      <div @click="goPage(-1)">0 - default</div>
    </div>
    <div v-for="(item, index) in list " class="list">
      <div @click="goPage(index)">
        {{ index + 1 }} -- {{ item }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router';
import mountKeyBoardMessageBox from '@/ImperativeComponents/keyBoardMessage.tsx'
const $router = useRouter()
const list = ref([
  "正交相机单立方",
  "正交相机双立方",
  "正交相机辅助线",
  "透视相机多立方",
  "透视相机辅助线",
  "透视相机滚动浏览全景图",
  "背景与天空图",
  "星空图",
  "六图天空盒",
  "物理",
  "物理2",
  "system_study",
  "system_study_camera",
  "system_study_floatArray",
  "system_study_gui",
  "system_study_Texture",
  "system_study_Material",
  "system_study_3D_TEXT",
  "system_study_light",
  "system_study_shadows",
  "system_study_鬼屋",
  "system_study_粒子",
  "system_study_星系",
  "system_study_滚动动画",
  "system_study_物理",
  "system_study_模型导入",
  "system_study_光线追踪与鼠标事件",
  "system_study_环境贴图",
  "system_study_真实渲染",
  "system_study_模块化项目",
  "system_study_着色器",
  "system_study_着色器绘图",
  "system_study_海",
  "system_study_银河",
  "system_study_模型改进",
  "system_study_咖啡的烟",
  "system_study_全息影像",
  "system_study_烟花",
  "system_study_着色器光源",
  "system_study_光源之海",
  "system_study_点阵效果",
  "system_study_地球",
  "system_study_地球_fixed",
]);

const goPage = (index: number) => {
  if (index === -1) {
    $router.push({
      name: 'ThreeModel'
    })
    return
  }
  $router.push({
    name: 'hello_thress_' + (index + 1)
  })
}
onMounted(() => {})
</script>

<style scoped lang="less">
.container {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  height: 100vh;

  .list {
    flex-basis: calc(100% / 18);
    &>* {
    user-select: none;
    margin: 10px;

    &:hover {
      cursor: pointer;
      color: #66ccff;
    }
  }
  }
}
</style>