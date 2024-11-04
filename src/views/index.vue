<template>
  <div class="">
    <div @click="goPage(-1)">0 - default</div>
    <div v-for="(item, index) in list " class="list">
        <div @click="goPage(index)">
          {{index + 1}} -- {{item}}
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import { useRouter } from 'vue-router';
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
]);

const goPage = (index:number)=>{
  if(index === -1){
    $router.push({
      name: 'ThreeModel'
    })
    return
  }
  $router.push({
    name: 'hello_thress_'+(index+1)
  })
}
</script>

<style scoped lang="less">
.list >*{
  user-select: none;
  margin: 10px;
  &:hover{
    cursor: pointer;
    color: #66ccff;
  }
}
</style>