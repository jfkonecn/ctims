import styles from "./LeftMenuComponent.module.scss";
import {Tree, TreeEventNodeParams} from "primereact/tree";
import React, {memo, useEffect, useRef, useState} from "react";
import TreeNode from "primereact/treenode";
import {Button} from "primereact/button";
import {TieredMenu} from "primereact/tieredmenu";
import {
  buildEmptyGroup,
  buildRootNodes, convertCtimsFormatToTreeNodeArray, convertTreeNodeArrayToCtimsFormat,
  deleteNodeFromChildrenArrayByKey,
  findArrayContainingKeyInsideATree, findObjectByKeyInTree, isObjectEmpty,
  makePropertiesWritable
} from "./helpers";
import {Menu} from "primereact/menu";
import * as jsonpath from "jsonpath";
import {EComponentType} from "./EComponentType";
import {IRootNode} from "./MatchingMenuAndForm";
import {useSelector} from "react-redux";
import {
  IAddCriteria,
  IDeleteCriteria,
  IOperatorChange, setCtmlDialogModel
} from "../../../../../apps/web/pages/store/slices/modalActionsSlice";
import {structuredClone} from "next/dist/compiled/@edge-runtime/primitives/structured-clone";
import {useDispatch} from "react-redux";
import { v4 as uuidv4 } from 'uuid';
import {IKeyToViewModel, setMatchViewModel} from "../../../../../apps/web/pages/store/slices/matchViewModelSlice";
import {store} from "../../../../../apps/web/pages/store/store";


interface ILeftMenuComponentProps {
  onTreeNodeClick: (componentType: EComponentType, note: TreeNode) => void;
  rootNodesProp: IRootNode;
}

const LeftMenuComponent = memo((props: ILeftMenuComponentProps) => {

  const {onTreeNodeClick, rootNodesProp} = props;

  const [rootNodes, setRootNodes] = useState<TreeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedKeys, setSelectedKeys] = useState<any>(null);
  const [expandedKeys, setExpandedKeys] = useState({0: true});

  const newNodeValue: IAddCriteria = useSelector((state: any) => state.modalActions.addCriteria);
  const nodeKeyToBeDeleted: IDeleteCriteria = useSelector((state: any) => state.modalActions.deleteCriteria);
  const operatorChanged: IOperatorChange = useSelector((state: any) => state.modalActions.operatorChange);
  const formChangedCounter: number = useSelector((state: any) => state.modalActions.formChangeCounter);

  const dispatch = useDispatch();

  // useEffect(() => {
  //   console.log('rootNodes state changed ', convertTreeNodeArrayToCtimsFormat(rootNodes));
  // }, [rootNodes]);

  const setRootNodesState = (newRootNodes: TreeNode[]) => {
    setRootNodes(newRootNodes);
    const firstSelectedKey = newRootNodes[0].children![0].key;
    setSelectedKeys(firstSelectedKey)
    const r = jsonpath.query(newRootNodes, `$..[?(@.key=="${firstSelectedKey}")]`);
    if(r.length > 0) {
      setSelectedNode(r[0]);
      onTreeNodeClick(r[0].data.type, r[0]);
    }
  }

  useEffect(() => {
    const state = store.getState();
    const activeArmId: string = state.matchViewModelActions.activeArmId;
    const storedViewModel: TreeNode[] = state.matchViewModelActions.viewModel[activeArmId];
    const currentCtmlMatchModel: any = state.matchViewModelActions.ctmlMatchModel;


    // formChangedCounter is used to determine if the dialog just opened or if the form was changed
    if (formChangedCounter === 0) {
      // console.log('current ctml match model ', currentCtmlMatchModel);
      // check if there is a view model stored in the redux store for the clicked arm id
      // if (storedViewModel) {
      //   // clone the view model from the redux store
      //   const storedViewModelClone: TreeNode[] = structuredClone(storedViewModel);
      //   // make the properties writable so that we can add new properties to the nodes and modify form data
      //   makePropertiesWritable(storedViewModelClone[0]);
      //   setRootNodesState(storedViewModelClone);
      //   console.log('stored view model ', storedViewModelClone);
      // }
      if (!isObjectEmpty(currentCtmlMatchModel.match)) {

        // console.log('currentCtmlMatchModel.match', currentCtmlMatchModel.match)
        const newViewModel = convertCtimsFormatToTreeNodeArray({match: currentCtmlMatchModel.match});
        setRootNodesState(newViewModel)
        console.log('new view model ', newViewModel);
      }
    }

    // if the form was changed, update the redux store with the new view model and ctims format
    if (formChangedCounter > 0) {
      console.log('form changed in left menu component');
      const viewModel: IKeyToViewModel = {};
      // we have to make a clone of the root nodes because if we don't clone the object writability will be lost
      viewModel[activeArmId] = structuredClone(rootNodes);
      dispatch(setMatchViewModel(viewModel))
      // convert view model (rootNodes) to ctims format
      const ctimsFormat = convertTreeNodeArrayToCtimsFormat(rootNodes);
      dispatch(setCtmlDialogModel(ctimsFormat));
    }
  }, [formChangedCounter]);

  useEffect(() => {
    if (newNodeValue && newNodeValue.nodeKey && newNodeValue.type && rootNodes.length > 0) {
      let {nodeKey, type}: {nodeKey: string, type: string} = newNodeValue;

      // Callback when add criteria button is clicked ( the one inside the form )
      addCriteria(nodeKey, type);
    }
  }, [newNodeValue]);

  // when a node is deleted we update the root nodes state
  useEffect(() => {
    if (nodeKeyToBeDeleted.nodeKey) {
      const newRootNodes = structuredClone(rootNodes);
      deleteNodeFromChildrenArrayByKey(newRootNodes[0], nodeKeyToBeDeleted.nodeKey);
      setRootNodes(newRootNodes);
      // after deleting a node we set the component to none
      onTreeNodeClick(EComponentType.None, newRootNodes[0]);
    }
  }, [nodeKeyToBeDeleted]);

  // when the operator is changed we update the label of the node (AND/OR)
  useEffect(() => {
    if (operatorChanged && operatorChanged.nodeKey && operatorChanged.operator && rootNodes.length > 0) {
      const {nodeKey, operator} = operatorChanged;
      const parentNode = findArrayContainingKeyInsideATree(rootNodes[0], nodeKey as string);
      // operator to lower case and capitalize first letter
      const newOperator = operator.toLowerCase().charAt(0).toUpperCase() + operator.toLowerCase().slice(1);
      if (parentNode) {
        parentNode.label = newOperator;
      }
      setRootNodes([...rootNodes]);
    }
  }, [operatorChanged]);

  const tieredMenu = useRef(null);
  const menu = useRef(null);

  // This prop is set from MatchingMenuAndFormComponent
  useEffect(() => {
    if (rootNodesProp) {
      const {rootLabel, firstChildLabel} = rootNodesProp;
      if (rootLabel && firstChildLabel) {
        if (firstChildLabel === 'Empty Group') {
          const roodNodes = buildEmptyGroup(rootLabel);
          const firstSelectedKey = roodNodes[0].key;
          setRootNodes(roodNodes);
          setSelectedNode(roodNodes[0]);
          setSelectedKeys(firstSelectedKey)
          onTreeNodeClick(EComponentType.None, roodNodes[0]);
        } else {
          const roodNodes = buildRootNodes(rootLabel, firstChildLabel);
          setRootNodesState(roodNodes);
        }

      }
    }
  }, [rootNodesProp]);


  // Unused because we removed little plus sign next to matching criteria text
  const menuItems = [
    {
      label: 'Clinical',
      command: () => {
        const rootNodes = buildRootNodes('And', 'Clinical');
        setRootNodesState(rootNodes);
      }
    },
    {
      label: 'Genomic',
      command: () => {
        const rootNodes = buildRootNodes('And', 'Genomic');
        setRootNodesState(rootNodes);
      }
    }
  ];

  const addCriteria = (nodeKey: string, type: string) => {
    if (nodeKey) {
      const parentNode = findArrayContainingKeyInsideATree(rootNodes[0], nodeKey as string);
      if (parentNode) {
        const newNode = {
          key: uuidv4(),
          label: type,
          data: {type: type === 'Clinical' ? EComponentType.ClinicalForm : EComponentType.GenomicForm},
        }
        parentNode.children!.push(newNode);
      }
      setRootNodes([...rootNodes]);
    }
  }

  const addCriteriaToSameList = (nodeKey: string, type: string) => {
    if (nodeKey) {
      const parentNode = findObjectByKeyInTree(rootNodes[0], nodeKey as string);
      if (parentNode) {
        // get last element from the children
        const newNode = {
          key: uuidv4(),
          label: type,
          data: {type: type === 'Clinical' ? EComponentType.ClinicalForm : EComponentType.GenomicForm},
        }
        parentNode.children!.push(newNode);
      }
      setRootNodes([...rootNodes]);
    }
  }

  const addSubGroup = (nodeKey: string) => {
    if (nodeKey) {
      const parentNode = findObjectByKeyInTree(rootNodes[0], nodeKey as string);
      if (parentNode) {
        const newNode = {
          key: uuidv4(),
          label: 'And',
          data: {},
          children: []
        };
        parentNode.children!.push(newNode);
      }
      setRootNodes([...rootNodes]);
    }
  }

  const tieredMenuClick = (e: any) => {
    // @ts-ignore
    tieredMenu.current.show(e);
  }

  const menuClick = (e: any) => {
    // @ts-ignore
    menu.current.show(e);
  }

  const nodeTemplate = (node: TreeNode) => {

    const [isMouseOverNode, setIsMouseOverNode] = useState(false);

    const tieredMenuModel = [
      {
        label: 'Add criteria to the same list',
        icon: 'pi pi-plus-circle',
        items: [
          {
            label: 'Clinical',
            command: () => {
              addCriteriaToSameList(selectedNode.key as string, 'Clinical');
            }
          },
          {
            label: 'Genomic',
            command: () => {
              addCriteriaToSameList(selectedNode.key as string, 'Genomic');
            }
          }
        ]

      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        command: () => { console.log('delete node selectedNode ', selectedNode) }
      },
      {
        separator:true
      },
      {
        label: 'Add criteria subgroup',
        icon: 'pi pi-clone',
        command: () => { addSubGroup(selectedNode.key) }
        // items: [
        //   {
        //     label: 'Clinical',
        //     command: () => {
        //       addCriteriaSubList(node.key as string, 'Clinical');
        //     }
        //   },
        //   {
        //     label: 'Genomic',
        //     command: () => {
        //       addCriteriaSubList(node.key as string, 'Genomic');
        //
        //     }
        //   },
        // ]
      }
    ]

    if (selectedNode) {
      const btnToShow = () => {
        let show = false;
        // we only display the three dots menu over the node if the node is selected and the mouse is over the node and the node is not a leaf
        if ((selectedNode as TreeNode).key === node.key && isMouseOverNode && (node.label === 'And' || node.label === 'Or')) {
          show = true;
        }
        // show=true
        return show ?
          <Button icon="pi pi-ellipsis-h"
                  className={styles.treeMenuBtn}
                  iconPos="right" onClick={tieredMenuClick} ></Button> : null
      }

      let label = <b>{node.label}</b>;
      return (
        <>
          <div className={styles.treeNodeContainer}
            onMouseOver={() => setIsMouseOverNode(true)}
            onMouseOut={() => setIsMouseOverNode(false)}
          >
              <span className="p-treenode-label" style={{width: '80%'}}>
                {label}
              </span>
              {btnToShow()}
              <TieredMenu model={tieredMenuModel} popup ref={tieredMenu} />
          </div>

        </>
      );
    }
    return null;
  }

  const onNodeSelect = (node: TreeEventNodeParams) => {
    // console.log('selectedKeys', selectedKeys);
    // console.log('expandedKeys', expandedKeys);
    setSelectedNode(node.node);
    setSelectedKeys(node.node.key as string)
    onTreeNodeClick(node.node.data.type, node.node);
  }

  const onNodeToggle = (e: any) => {
    console.log('selectedKeys', selectedKeys);
    setExpandedKeys(e.value)
  }

  return (
    <>
      {/*<Menu model={menuItems} ref={menu} popup id="criteria_popup_menu"/>*/}
        <div className={styles.matchingCriteriaMenuContainer}>
          <div className={styles.matchingCriteriaTextContainer}>
            <div className={styles.matchingCriteriaText}>Matching Criteria</div>
            {/*<i className="pi pi-plus-circle" onClick={(e) => {*/}
            {/*  menuClick(e);*/}
            {/*}}></i>*/}

          </div>
          <Tree value={rootNodes}
                nodeTemplate={nodeTemplate}
                expandedKeys={expandedKeys}
                selectionKeys={selectedKeys}
                selectionMode="single"
                onSelect={onNodeSelect}
                onToggle={e => onNodeToggle(e) } />
        </div>
    </>

    )

}, (prevProps, nextProps) => {
  // return prevProps.rootNodesProp === nextProps.rootNodesProp;
  return false;
});
export default LeftMenuComponent;